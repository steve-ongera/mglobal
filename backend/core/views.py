from rest_framework import viewsets, generics, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Avg
from django.conf import settings
from django.utils import timezone
import requests
import base64
from datetime import datetime

from .models import (
    User, Address, County, PickupStation, Category, Brand,
    Product, ProductImage, ProductVariant, Review, Wishlist,
    Cart, CartItem, Coupon, Order, OrderItem, Notification, Banner
)
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer,
    AddressSerializer, CountySerializer, PickupStationSerializer,
    CategorySerializer, CategoryListSerializer, BrandSerializer,
    ProductListSerializer, ProductDetailSerializer, ReviewSerializer,
    WishlistSerializer, CartSerializer, CartItemSerializer, CouponSerializer,
    OrderSerializer, CreateOrderSerializer, NotificationSerializer, BannerSerializer
)


# ─── Auth ─────────────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(tokens.access_token),
            'refresh': str(tokens),
        }, status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        # Update FCM token if provided
        fcm_token = request.data.get('fcm_token', '')
        if fcm_token:
            user.fcm_token = fcm_token
            user.save(update_fields=['fcm_token'])
        tokens = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(tokens.access_token),
            'refresh': str(tokens),
        })


class ProfileViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        if request.method == 'PATCH':
            serializer = self.get_serializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=['post'])
    def update_fcm(self, request):
        token = request.data.get('fcm_token', '')
        if token:
            request.user.fcm_token = token
            request.user.save(update_fields=['fcm_token'])
        return Response({'status': 'updated'})


# ─── Address ──────────────────────────────────────────────────────────────────

class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ─── County & Pickup ──────────────────────────────────────────────────────────

class CountyViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = County.objects.all().prefetch_related('pickup_stations')
    serializer_class = CountySerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'


class PickupStationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PickupStation.objects.filter(is_active=True).select_related('county')
    serializer_class = PickupStationSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['county', 'county__slug']


# ─── Category ─────────────────────────────────────────────────────────────────

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True, parent=None).prefetch_related('children')
    permission_classes = [AllowAny]
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action == 'list':
            return CategoryListSerializer
        return CategorySerializer

    @action(detail=False, methods=['get'], url_path='all')
    def all_flat(self, request):
        cats = Category.objects.filter(is_active=True)
        return Response(CategoryListSerializer(cats, many=True).data)


# ─── Brand ────────────────────────────────────────────────────────────────────

class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'


# ─── Product ──────────────────────────────────────────────────────────────────

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category__slug', 'brand__slug', 'is_featured', 'is_flash_sale']
    search_fields = ['name', 'description', 'sku', 'brand__name', 'category__name']
    ordering_fields = ['price', 'created_at', 'sold_count', 'views']
    ordering = ['-created_at']
    lookup_field = 'slug'

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True).select_related('category', 'brand').prefetch_related('images', 'reviews')
        # Price filter
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            qs = qs.filter(price__gte=min_price)
        if max_price:
            qs = qs.filter(price__lte=max_price)
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductListSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment views
        Product.objects.filter(pk=instance.pk).update(views=instance.views + 1)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='featured')
    def featured(self, request):
        qs = self.get_queryset().filter(is_featured=True)[:12]
        return Response(ProductListSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'], url_path='flash-sale')
    def flash_sale(self, request):
        qs = self.get_queryset().filter(is_flash_sale=True, flash_sale_end__gt=timezone.now())[:20]
        return Response(ProductListSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=True, methods=['get', 'post'], permission_classes=[IsAuthenticated])
    def reviews(self, request, slug=None):
        product = self.get_object()
        if request.method == 'POST':
            # Check verified purchase
            is_verified = OrderItem.objects.filter(
                order__user=request.user, product=product, order__status='delivered'
            ).exists()
            serializer = ReviewSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            serializer.save(user=request.user, product=product, is_verified_purchase=is_verified)
            return Response(serializer.data, status=201)
        reviews = product.reviews.all()
        return Response(ReviewSerializer(reviews, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'], url_path='search')
    def search(self, request):
        q = request.query_params.get('q', '')
        if not q:
            return Response([])
        qs = self.get_queryset().filter(
            Q(name__icontains=q) | Q(description__icontains=q) |
            Q(brand__name__icontains=q) | Q(category__name__icontains=q)
        )[:30]
        return Response(ProductListSerializer(qs, many=True, context={'request': request}).data)


# ─── Wishlist ─────────────────────────────────────────────────────────────────

class WishlistViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = WishlistSerializer

    def list(self, request):
        items = Wishlist.objects.filter(user=request.user).select_related('product')
        return Response(WishlistSerializer(items, many=True, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def toggle(self, request):
        product_id = request.data.get('product_id')
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=404)
        item, created = Wishlist.objects.get_or_create(user=request.user, product=product)
        if not created:
            item.delete()
            return Response({'action': 'removed'})
        return Response({'action': 'added'})


# ─── Cart ─────────────────────────────────────────────────────────────────────

class CartViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    def _get_cart(self, user):
        cart, _ = Cart.objects.get_or_create(user=user)
        return cart

    def list(self, request):
        cart = self._get_cart(request.user)
        return Response(CartSerializer(cart, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def add(self, request):
        cart = self._get_cart(request.user)
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))
        variant_id = request.data.get('variant_id')

        try:
            product = Product.objects.get(id=product_id, is_active=True)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=404)

        if product.stock < quantity:
            return Response({'error': f'Only {product.stock} items in stock'}, status=400)

        variant = None
        if variant_id:
            try:
                variant = product.variants.get(id=variant_id)
            except:
                pass

        item, created = CartItem.objects.get_or_create(
            cart=cart, product=product, variant=variant,
            defaults={'quantity': quantity}
        )
        if not created:
            item.quantity += quantity
            item.save()

        return Response(CartSerializer(cart, context={'request': request}).data)

    @action(detail=False, methods=['patch'])
    def update_item(self, request):
        cart = self._get_cart(request.user)
        item_id = request.data.get('item_id')
        quantity = int(request.data.get('quantity', 1))
        try:
            item = cart.items.get(id=item_id)
        except CartItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=404)
        if quantity <= 0:
            item.delete()
        else:
            item.quantity = quantity
            item.save()
        return Response(CartSerializer(cart, context={'request': request}).data)

    @action(detail=False, methods=['delete'])
    def remove_item(self, request):
        cart = self._get_cart(request.user)
        item_id = request.query_params.get('item_id')
        cart.items.filter(id=item_id).delete()
        return Response(CartSerializer(cart, context={'request': request}).data)

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        cart = self._get_cart(request.user)
        cart.items.all().delete()
        return Response({'message': 'Cart cleared'})


# ─── Coupon ───────────────────────────────────────────────────────────────────

class CouponValidateView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code', '')
        total = float(request.data.get('total', 0))
        try:
            coupon = Coupon.objects.get(
                code__iexact=code, is_active=True,
                valid_from__lte=timezone.now(), valid_to__gte=timezone.now()
            )
        except Coupon.DoesNotExist:
            return Response({'error': 'Invalid or expired coupon'}, status=400)

        if coupon.max_uses and coupon.used_count >= coupon.max_uses:
            return Response({'error': 'Coupon usage limit reached'}, status=400)

        if total < float(coupon.minimum_order):
            return Response({'error': f'Minimum order of KSh {coupon.minimum_order} required'}, status=400)

        if coupon.discount_type == 'percent':
            discount = total * float(coupon.discount_value) / 100
        else:
            discount = float(coupon.discount_value)

        return Response({
            'valid': True,
            'discount_type': coupon.discount_type,
            'discount_value': float(coupon.discount_value),
            'discount_amount': round(discount, 2),
        })


# ─── M-Pesa ───────────────────────────────────────────────────────────────────

def get_mpesa_token():
    if settings.MPESA_DEBUG:
        return 'debug_token'
    key = settings.MPESA_CONSUMER_KEY
    secret = settings.MPESA_CONSUMER_SECRET
    encoded = base64.b64encode(f"{key}:{secret}".encode()).decode()
    resp = requests.get(
        f"{settings.MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials",
        headers={'Authorization': f'Basic {encoded}'}
    )
    return resp.json().get('access_token')


def initiate_stk_push(phone, amount, order_number):
    if settings.MPESA_DEBUG:
        return {'ResponseCode': '0', 'CheckoutRequestID': f'DEBUG_{order_number}', 'debug': True}

    token = get_mpesa_token()
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    shortcode = settings.MPESA_SHORTCODE
    passkey = settings.MPESA_PASSKEY
    password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()

    payload = {
        'BusinessShortCode': shortcode,
        'Password': password,
        'Timestamp': timestamp,
        'TransactionType': 'CustomerPayBillOnline',
        'Amount': int(amount),
        'PartyA': phone,
        'PartyB': shortcode,
        'PhoneNumber': phone,
        'CallBackURL': settings.MPESA_CALLBACK_URL,
        'AccountReference': order_number,
        'TransactionDesc': f'Payment for {order_number}',
    }
    resp = requests.post(
        f"{settings.MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest",
        json=payload,
        headers={'Authorization': f'Bearer {token}'}
    )
    return resp.json()


class MpesaCallbackView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data.get('Body', {}).get('stkCallback', {})
        result_code = data.get('ResultCode')
        order_number = data.get('AccountReference', '')

        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})

        if result_code == 0:
            items = data.get('CallbackMetadata', {}).get('Item', [])
            transaction_id = next((i['Value'] for i in items if i['Name'] == 'MpesaReceiptNumber'), '')
            order.payment_status = 'paid'
            order.mpesa_transaction_id = transaction_id
            order.status = 'confirmed'
            order.save()
            # Send push notification
            _send_push(order.user, 'Payment Confirmed!',
                       f'Your order {order.order_number} has been confirmed.')
        else:
            order.payment_status = 'failed'
            order.save()

        return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})


# ─── Order ────────────────────────────────────────────────────────────────────

def _send_push(user, title, message, order=None):
    """Send Firebase push notification."""
    if not user or not user.fcm_token or not settings.FCM_SERVER_KEY:
        return
    try:
        Notification.objects.create(user=user, type='order_update', title=title, message=message, order=order)
        requests.post(
            'https://fcm.googleapis.com/fcm/send',
            json={
                'to': user.fcm_token,
                'notification': {'title': title, 'body': message},
                'data': {'order_number': order.order_number if order else ''}
            },
            headers={
                'Authorization': f'key={settings.FCM_SERVER_KEY}',
                'Content-Type': 'application/json'
            }
        )
    except Exception:
        pass


class OrderViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items')

    def list(self, request):
        orders = self.get_queryset()
        return Response(OrderSerializer(orders, many=True).data)

    def retrieve(self, request, pk=None):
        try:
            order = self.get_queryset().get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        return Response(OrderSerializer(order).data)

    @action(detail=False, methods=['post'])
    def create_order(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Get cart
        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            return Response({'error': 'Cart is empty'}, status=400)

        items = cart.items.all().select_related('product', 'variant')
        if not items.exists():
            return Response({'error': 'Cart is empty'}, status=400)

        # Validate stock
        for item in items:
            if item.product.stock < item.quantity:
                return Response({'error': f'Insufficient stock for {item.product.name}'}, status=400)

        # Subtotal
        subtotal = sum(item.subtotal for item in items)

        # Delivery fee
        delivery_fee = 0
        pickup_station = None
        delivery_address = None

        if data['delivery_type'] == 'pickup':
            ps_id = data.get('pickup_station_id')
            if not ps_id:
                return Response({'error': 'Please select a pickup station'}, status=400)
            try:
                pickup_station = PickupStation.objects.get(id=ps_id, is_active=True)
                delivery_fee = pickup_station.fee
            except PickupStation.DoesNotExist:
                return Response({'error': 'Invalid pickup station'}, status=400)
        else:
            addr_id = data.get('delivery_address_id')
            if not addr_id:
                return Response({'error': 'Please provide a delivery address'}, status=400)
            try:
                delivery_address = Address.objects.get(id=addr_id, user=request.user)
                delivery_fee = 350  # Flat home delivery fee
            except Address.DoesNotExist:
                return Response({'error': 'Address not found'}, status=400)

        # Coupon
        coupon = None
        discount_amount = 0
        coupon_code = data.get('coupon_code', '')
        if coupon_code:
            try:
                coupon = Coupon.objects.get(
                    code__iexact=coupon_code, is_active=True,
                    valid_from__lte=timezone.now(), valid_to__gte=timezone.now()
                )
                if coupon.discount_type == 'percent':
                    discount_amount = subtotal * coupon.discount_value / 100
                else:
                    discount_amount = coupon.discount_value
                coupon.used_count += 1
                coupon.save()
            except Coupon.DoesNotExist:
                pass

        total = subtotal + delivery_fee - discount_amount

        # Create order
        order = Order.objects.create(
            user=request.user,
            delivery_type=data['delivery_type'],
            pickup_station=pickup_station,
            delivery_address=delivery_address,
            delivery_fee=delivery_fee,
            subtotal=subtotal,
            coupon=coupon,
            discount_amount=discount_amount,
            total=total,
            payment_method=data['payment_method'],
            mpesa_phone=data.get('mpesa_phone', ''),
            notes=data.get('notes', '')
        )

        # Order items
        for item in items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                product_name=item.product.name,
                product_sku=item.product.sku,
                variant_info=f"{item.variant.name}: {item.variant.value}" if item.variant else '',
                quantity=item.quantity,
                unit_price=item.product.effective_price,
                subtotal=item.subtotal,
                image=''
            )
            # Deduct stock
            Product.objects.filter(pk=item.product.pk).update(
                stock=item.product.stock - item.quantity,
                sold_count=item.product.sold_count + item.quantity
            )

        # Clear cart
        cart.items.all().delete()

        # Payment
        mpesa_resp = None
        if data['payment_method'] == 'mpesa':
            phone = data.get('mpesa_phone', request.user.phone)
            phone = phone.replace('+', '').replace(' ', '')
            if phone.startswith('0'):
                phone = '254' + phone[1:]
            mpesa_resp = initiate_stk_push(phone, total, order.order_number)
            if settings.MPESA_DEBUG:
                order.payment_status = 'paid'
                order.status = 'confirmed'
                order.mpesa_transaction_id = f'DEBUG_{order.order_number}'
                order.save()

        # Send push notification
        _send_push(request.user, 'Order Placed!',
                   f'Your order {order.order_number} has been placed successfully.', order)

        response_data = OrderSerializer(order).data
        if mpesa_resp:
            response_data['mpesa_response'] = mpesa_resp
        return Response(response_data, status=201)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        try:
            order = self.get_queryset().get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        if order.status not in ['pending', 'confirmed']:
            return Response({'error': 'Order cannot be cancelled at this stage'}, status=400)
        order.status = 'cancelled'
        order.save()
        # Restore stock
        for item in order.items.all():
            if item.product:
                Product.objects.filter(pk=item.product.pk).update(
                    stock=item.product.stock + item.quantity,
                    sold_count=max(0, item.product.sold_count - item.quantity)
                )
        _send_push(request.user, 'Order Cancelled',
                   f'Your order {order.order_number} has been cancelled.', order)
        return Response(OrderSerializer(order).data)


# ─── Notifications ────────────────────────────────────────────────────────────

class NotificationViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def list(self, request):
        notifs = self.get_queryset()[:50]
        return Response(NotificationSerializer(notifs, many=True).data)

    @action(detail=False, methods=['post'])
    def mark_read(self, request):
        ids = request.data.get('ids', [])
        if ids:
            self.get_queryset().filter(id__in=ids).update(is_read=True)
        else:
            self.get_queryset().update(is_read=True)
        return Response({'status': 'done'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})


# ─── Banner ───────────────────────────────────────────────────────────────────

class BannerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Banner.objects.filter(is_active=True)
    serializer_class = BannerSerializer
    permission_classes = [AllowAny]