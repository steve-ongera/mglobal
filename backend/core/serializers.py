from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import (
    User, Address, County, PickupStation, Category, Brand,
    Product, ProductImage, ProductVariant, ProductSpecification,
    Review, Wishlist, Cart, CartItem, Coupon, Order, OrderItem, Notification, Banner
)


# ─── Auth ─────────────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'password', 'password2']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        try:
            user = User.objects.get(email=data['email'])
        except User.DoesNotExist:
            raise serializers.ValidationError('Invalid credentials.')
        user = authenticate(username=user.username, password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid credentials.')
        data['user'] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'avatar', 'created_at']
        read_only_fields = ['id', 'created_at']


# ─── Address ──────────────────────────────────────────────────────────────────

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = '__all__'
        read_only_fields = ['user']


# ─── County & Pickup ──────────────────────────────────────────────────────────

class PickupStationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PickupStation
        fields = '__all__'


class CountySerializer(serializers.ModelSerializer):
    pickup_stations = PickupStationSerializer(many=True, read_only=True)

    class Meta:
        model = County
        fields = ['id', 'name', 'slug', 'pickup_stations']


# ─── Category ─────────────────────────────────────────────────────────────────

class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'parent', 'image', 'icon', 'description',
                  'meta_title', 'meta_description', 'children']

    def get_children(self, obj):
        return CategorySerializer(obj.children.filter(is_active=True), many=True).data


class CategoryListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'image', 'icon']


# ─── Brand ────────────────────────────────────────────────────────────────────

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = '__all__'


# ─── Product ──────────────────────────────────────────────────────────────────

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'is_primary', 'order']


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = '__all__'


class ProductSpecSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductSpecification
        fields = ['key', 'value']


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'user', 'user_name', 'user_avatar', 'rating', 'title', 'body',
                  'is_verified_purchase', 'helpful_count', 'created_at']
        read_only_fields = ['user', 'is_verified_purchase', 'helpful_count']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_user_avatar(self, obj):
        if obj.user.avatar:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.user.avatar.url) if request else obj.user.avatar.url
        return None


class ProductListSerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    discount_percent = serializers.ReadOnlyField()
    effective_price = serializers.ReadOnlyField()
    in_stock = serializers.ReadOnlyField()
    avg_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'sku', 'category_name', 'brand_name',
            'price', 'compare_price', 'effective_price', 'discount_percent',
            'is_flash_sale', 'flash_sale_price', 'flash_sale_end',
            'in_stock', 'sold_count', 'primary_image',
            'avg_rating', 'review_count', 'meta_title', 'meta_description', 'meta_keywords'
        ]

    def get_primary_image(self, obj):
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if img:
            request = self.context.get('request')
            return request.build_absolute_uri(img.image.url) if request else img.image.url
        return None

    def get_avg_rating(self, obj):
        reviews = obj.reviews.all()
        if reviews.exists():
            return round(sum(r.rating for r in reviews) / reviews.count(), 1)
        return 0

    def get_review_count(self, obj):
        return obj.reviews.count()


class ProductDetailSerializer(ProductListSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    specifications = ProductSpecSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    category = CategoryListSerializer(read_only=True)
    brand = BrandSerializer(read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + [
            'description', 'short_description', 'weight', 'stock', 'views',
            'images', 'variants', 'specifications', 'reviews', 'category', 'brand',
            'created_at', 'updated_at'
        ]


# ─── Cart ─────────────────────────────────────────────────────────────────────

class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.UUIDField(write_only=True)
    variant_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_id', 'variant', 'variant_id', 'quantity', 'subtotal']


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total', 'item_count']

    def get_total(self, obj):
        return sum(item.subtotal for item in obj.items.all())

    def get_item_count(self, obj):
        return sum(item.quantity for item in obj.items.all())


# ─── Coupon ───────────────────────────────────────────────────────────────────

class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ['code', 'discount_type', 'discount_value', 'minimum_order']


# ─── Order ────────────────────────────────────────────────────────────────────

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = '__all__'


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    pickup_station_detail = PickupStationSerializer(source='pickup_station', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'delivery_type', 'pickup_station',
            'pickup_station_detail', 'delivery_address', 'delivery_fee',
            'subtotal', 'discount_amount', 'total', 'payment_method',
            'payment_status', 'mpesa_transaction_id', 'items', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['order_number', 'status', 'payment_status', 'mpesa_transaction_id']


class CreateOrderSerializer(serializers.Serializer):
    delivery_type = serializers.ChoiceField(choices=['pickup', 'home'])
    pickup_station_id = serializers.IntegerField(required=False, allow_null=True)
    delivery_address_id = serializers.IntegerField(required=False, allow_null=True)
    payment_method = serializers.ChoiceField(choices=['mpesa', 'card', 'cod'])
    mpesa_phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    coupon_code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


# ─── Notification ─────────────────────────────────────────────────────────────

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['user']


# ─── Banner ───────────────────────────────────────────────────────────────────

class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = '__all__'


# ─── Wishlist ─────────────────────────────────────────────────────────────────

class WishlistSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = Wishlist
        fields = ['id', 'product', 'added_at']