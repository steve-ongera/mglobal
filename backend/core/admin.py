from django.contrib import admin
from django.utils.html import format_html
from .models import (
    User, Address, County, PickupStation, Category, Brand,
    Product, ProductImage, ProductVariant, ProductSpecification,
    Review, Wishlist, Cart, CartItem, Coupon, Order, OrderItem, Notification, Banner
)

admin.site.site_header = "Mgobal Admin"
admin.site.site_title = "Mgobal"
admin.site.index_title = "Store Management"


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'phone', 'is_active', 'created_at']
    search_fields = ['username', 'email', 'phone']


class PickupStationInline(admin.TabularInline):
    model = PickupStation
    extra = 1


@admin.register(County)
class CountyAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    inlines = [PickupStationInline]


@admin.register(PickupStation)
class PickupStationAdmin(admin.ModelAdmin):
    list_display = ['name', 'county', 'fee', 'is_active']
    list_filter = ['county', 'is_active']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'parent', 'is_active', 'order']
    list_filter = ['is_active', 'parent']
    prepopulated_fields = {'slug': ('name',)}


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1


class ProductSpecInline(admin.TabularInline):
    model = ProductSpecification
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'sku', 'category', 'price', 'stock', 'is_active', 'is_featured']
    list_filter = ['is_active', 'is_featured', 'is_flash_sale', 'category', 'brand']
    search_fields = ['name', 'sku']
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ProductImageInline, ProductVariantInline, ProductSpecInline]


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product', 'product_name', 'quantity', 'unit_price', 'subtotal']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'user', 'status', 'payment_status', 'total', 'created_at']
    list_filter = ['status', 'payment_status', 'delivery_type', 'payment_method']
    search_fields = ['order_number', 'user__email']
    inlines = [OrderItemInline]


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ['code', 'discount_type', 'discount_value', 'used_count', 'is_active']


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_active', 'order']

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'type', 'title', 'is_read', 'created_at']