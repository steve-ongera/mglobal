from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'brands', views.BrandViewSet, basename='brand')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'counties', views.CountyViewSet, basename='county')
router.register(r'pickup-stations', views.PickupStationViewSet, basename='pickupstation')
router.register(r'addresses', views.AddressViewSet, basename='address')
router.register(r'cart', views.CartViewSet, basename='cart')
router.register(r'wishlist', views.WishlistViewSet, basename='wishlist')
router.register(r'orders', views.OrderViewSet, basename='order')
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'banners', views.BannerViewSet, basename='banner')
router.register(r'profile', views.ProfileViewSet, basename='profile')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('coupon/validate/', views.CouponValidateView.as_view(), name='coupon-validate'),
    path('mpesa/callback/', views.MpesaCallbackView.as_view(), name='mpesa-callback'),
]