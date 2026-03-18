from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.text import slugify
import uuid


# ─── User ───────────────────────────────────────────────────────────────────

class User(AbstractUser):
    phone = models.CharField(max_length=15, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    fcm_token = models.TextField(blank=True)  # Firebase push token
    email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email or self.username


# ─── Address ─────────────────────────────────────────────────────────────────

class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    full_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=15)
    county = models.CharField(max_length=100)
    town = models.CharField(max_length=100)
    estate = models.CharField(max_length=200)
    landmark = models.CharField(max_length=200, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.is_default:
            Address.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} — {self.county}, {self.town}"


# ─── County & Pickup Stations ────────────────────────────────────────────────

class County(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = 'Counties'
        ordering = ['name']


class PickupStation(models.Model):
    county = models.ForeignKey(County, on_delete=models.CASCADE, related_name='pickup_stations')
    name = models.CharField(max_length=200)
    address = models.TextField()
    phone = models.CharField(max_length=15)
    fee = models.DecimalField(max_digits=8, decimal_places=2)
    working_hours = models.CharField(max_length=100, default='Mon-Sat 8AM-6PM')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.county.name}) — KSh {self.fee}"


# ─── Category ────────────────────────────────────────────────────────────────

class Category(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='children')
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    icon = models.CharField(max_length=100, blank=True)  # Bootstrap icon name
    description = models.TextField(blank=True)
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['order', 'name']


# ─── Brand ────────────────────────────────────────────────────────────────────

class Brand(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    logo = models.ImageField(upload_to='brands/', blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ─── Product ─────────────────────────────────────────────────────────────────

class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=500)
    slug = models.SlugField(unique=True, max_length=600)
    sku = models.CharField(max_length=100, unique=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    description = models.TextField()
    short_description = models.CharField(max_length=500, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    compare_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    min_stock_alert = models.PositiveIntegerField(default=5)
    weight = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)  # kg
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_flash_sale = models.BooleanField(default=False)
    flash_sale_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    flash_sale_end = models.DateTimeField(null=True, blank=True)
    # SEO
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.TextField(blank=True)
    meta_keywords = models.CharField(max_length=500, blank=True)
    # Stats
    views = models.PositiveIntegerField(default=0)
    sold_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            self.slug = f"{base}-{self.sku.lower()}"
        super().save(*args, **kwargs)

    @property
    def discount_percent(self):
        if self.compare_price and self.compare_price > self.price:
            return int((1 - self.price / self.compare_price) * 100)
        return 0

    @property
    def effective_price(self):
        from django.utils import timezone
        if self.is_flash_sale and self.flash_sale_price and self.flash_sale_end:
            if timezone.now() < self.flash_sale_end:
                return self.flash_sale_price
        return self.price

    @property
    def in_stock(self):
        return self.stock > 0

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-created_at']


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/')
    alt_text = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    name = models.CharField(max_length=100)  # e.g. "Color", "Size"
    value = models.CharField(max_length=100)  # e.g. "Red", "XL"
    sku_suffix = models.CharField(max_length=50)
    price_adjustment = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    stock = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to='variants/', blank=True, null=True)

    def __str__(self):
        return f"{self.product.name} — {self.name}: {self.value}"


class ProductSpecification(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='specifications')
    key = models.CharField(max_length=100)
    value = models.CharField(max_length=500)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']


# ─── Review ──────────────────────────────────────────────────────────────────

class Review(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField(choices=[(i, i) for i in range(1, 6)])
    title = models.CharField(max_length=200, blank=True)
    body = models.TextField()
    is_verified_purchase = models.BooleanField(default=False)
    helpful_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('product', 'user')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} — {self.product} ({self.rating}★)"


# ─── Wishlist ─────────────────────────────────────────────────────────────────

class Wishlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')


# ─── Cart ─────────────────────────────────────────────────────────────────────

class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cart', null=True, blank=True)
    session_key = models.CharField(max_length=40, blank=True)  # for guest carts
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('cart', 'product', 'variant')

    @property
    def subtotal(self):
        return self.product.effective_price * self.quantity


# ─── Coupon ───────────────────────────────────────────────────────────────────

class Coupon(models.Model):
    DISCOUNT_TYPE_CHOICES = [('percent', 'Percentage'), ('fixed', 'Fixed Amount')]
    code = models.CharField(max_length=50, unique=True)
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    minimum_order = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    used_count = models.PositiveIntegerField(default=0)
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.code


# ─── Order ────────────────────────────────────────────────────────────────────

class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('returned', 'Returned'),
        ('refunded', 'Refunded'),
    ]
    DELIVERY_CHOICES = [('pickup', 'Pickup Station'), ('home', 'Home Delivery')]
    PAYMENT_METHOD_CHOICES = [('mpesa', 'M-Pesa'), ('card', 'Card'), ('cod', 'Cash on Delivery')]
    PAYMENT_STATUS_CHOICES = [('pending', 'Pending'), ('paid', 'Paid'), ('failed', 'Failed'), ('refunded', 'Refunded')]

    order_number = models.CharField(max_length=20, unique=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Delivery
    delivery_type = models.CharField(max_length=10, choices=DELIVERY_CHOICES, default='pickup')
    pickup_station = models.ForeignKey(PickupStation, on_delete=models.SET_NULL, null=True, blank=True)
    delivery_address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True)
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    # Pricing
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)

    # Payment
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES)
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES, default='pending')
    mpesa_transaction_id = models.CharField(max_length=50, blank=True)
    mpesa_phone = models.CharField(max_length=15, blank=True)

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.order_number:
            import random, string
            self.order_number = 'MGB' + ''.join(random.choices(string.digits, k=8))
        super().save(*args, **kwargs)

    def __str__(self):
        return self.order_number

    class Meta:
        ordering = ['-created_at']


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    product_name = models.CharField(max_length=500)  # snapshot
    product_sku = models.CharField(max_length=100)
    variant_info = models.CharField(max_length=200, blank=True)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    image = models.URLField(blank=True)

    def __str__(self):
        return f"{self.product_name} × {self.quantity}"


# ─── Notification ────────────────────────────────────────────────────────────

class Notification(models.Model):
    TYPE_CHOICES = [
        ('order_update', 'Order Update'),
        ('promo', 'Promotion'),
        ('flash_sale', 'Flash Sale'),
        ('system', 'System'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} — {self.title}"


# ─── Banner / Flash Sale ──────────────────────────────────────────────────────

class Banner(models.Model):
    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=300, blank=True)
    image = models.ImageField(upload_to='banners/')
    link = models.CharField(max_length=300, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']