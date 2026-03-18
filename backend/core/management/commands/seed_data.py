"""
Mgobal Seed Management Command
================================
Usage:
    python manage.py seed_data                            # seed everything
    python manage.py seed_data --module counties          # only counties & pickup stations
    python manage.py seed_data --module categories        # only categories
    python manage.py seed_data --module brands            # only brands
    python manage.py seed_data --module products          # only products
    python manage.py seed_data --module coupons           # only coupons
    python manage.py seed_data --module banners           # only banners
    python manage.py seed_data --module users             # only superuser + demo users
    python manage.py seed_data --flush                    # wipe then re-seed everything
    python manage.py seed_data --images "D:\\path\\imgs"  # custom local images folder
    python manage.py seed_data --no-images                # skip all images (text only)

    Combinations:
    python manage.py seed_data --module products --images "D:\\gadaf\\Documents\\images\\jumia"
    python manage.py seed_data --flush --no-images
"""

import os
import random
import shutil
import urllib.request
import urllib.error
from pathlib import Path
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify
from django.contrib.auth import get_user_model

User = get_user_model()

# ── Default local image folder ────────────────────────────────────────────────
DEFAULT_IMAGE_DIR = r"D:\gadaf\Documents\images\jumia"
SUPPORTED_EXTS    = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

# ── Picsum fallback — consistent images per category, no API key needed ───────
PICSUM_SEEDS = {
    "phone":      [10, 20, 30, 40, 50],
    "laptop":     [60, 70, 80, 90],
    "tv":         [100, 110, 120],
    "headphones": [130, 140, 150],
    "shoes":      [160, 170, 180, 190],
    "fashion":    [200, 210, 220, 230],
    "kitchen":    [240, 250, 260],
    "home":       [270, 280, 290],
    "sports":     [300, 310, 320],
    "book":       [330, 340, 350],
    "food":       [360, 370, 380],
    "car":        [390, 400, 410],
    "toy":        [420, 430, 440],
    "beauty":     [450, 460, 470],
    "default":    list(range(1, 60)),
}


# ─────────────────────────────────────────────────────────────────────────────
#  ImageManager  (style is now passed in as a plain callable, not stdout.style)
# ─────────────────────────────────────────────────────────────────────────────

class ImageManager:
    """
    Handles copying from a local folder OR downloading from Picsum.
    `write`  — callable(msg)         e.g. self.stdout.write
    `success`— callable(msg) → str   e.g. self.style.SUCCESS
    `warning`— callable(msg) → str   e.g. self.style.WARNING
    """

    def __init__(self, media_root, source_dir=None, no_images=False,
                 write=None, success=None, warning=None):
        self.media_root   = Path(media_root)
        self.no_images    = no_images
        self._write       = write   or (lambda m: None)
        self._success     = success or (lambda m: m)
        self._warning     = warning or (lambda m: m)
        self._local_pool  = []

        if no_images:
            return

        src = Path(source_dir or DEFAULT_IMAGE_DIR)
        if src.exists():
            self._local_pool = [
                f for f in src.rglob("*")
                if f.is_file() and f.suffix.lower() in SUPPORTED_EXTS
            ]
            self._write(self._success(
                f"  📂 Local images loaded: {len(self._local_pool)} files from {src}"
            ))
        else:
            self._write(self._warning(
                f"  ⚠  Local dir not found: {src}\n"
                f"     Falling back to Picsum internet images."
            ))

    # ── internal helpers ──────────────────────────────────────────────────────

    def _dest_dir(self, subdir):
        d = self.media_root / subdir
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _copy_local(self, subdir):
        if not self._local_pool:
            return ""
        src = random.choice(self._local_pool)
        dest = self._dest_dir(subdir) / src.name
        if not dest.exists():
            shutil.copy2(src, dest)
        return f"{subdir}/{src.name}"

    def _copy_local_n(self, subdir, n):
        if not self._local_pool:
            return []
        chosen = random.sample(self._local_pool, min(n, len(self._local_pool)))
        d = self._dest_dir(subdir)
        paths = []
        for src in chosen:
            dest = d / src.name
            if not dest.exists():
                shutil.copy2(src, dest)
            paths.append(f"{subdir}/{src.name}")
        return paths

    def _download_picsum(self, subdir, seed, size=400):
        d        = self._dest_dir(subdir)
        filename = f"picsum_{seed}_{size}.jpg"
        dest     = d / filename
        if dest.exists():
            return f"{subdir}/{filename}"
        url = f"https://picsum.photos/seed/{seed}/{size}/{size}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "MgobalSeed/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                dest.write_bytes(resp.read())
            return f"{subdir}/{filename}"
        except Exception:
            return ""

    # ── public API ────────────────────────────────────────────────────────────

    def get_one(self, subdir, hint="default"):
        if self.no_images:
            return ""
        if self._local_pool:
            return self._copy_local(subdir)
        seeds = PICSUM_SEEDS.get(hint, PICSUM_SEEDS["default"])
        return self._download_picsum(subdir, random.choice(seeds))

    def get_many(self, subdir, n=3, hint="default"):
        if self.no_images:
            return []
        if self._local_pool:
            return self._copy_local_n(subdir, n)
        seeds  = PICSUM_SEEDS.get(hint, PICSUM_SEEDS["default"])
        chosen = random.sample(seeds, min(n, len(seeds)))
        return [p for p in (self._download_picsum(subdir, s) for s in chosen) if p]


# ─────────────────────────────────────────────────────────────────────────────
#  Static data
# ─────────────────────────────────────────────────────────────────────────────

COUNTIES_DATA = {
    "Nairobi": [
        ("CBD Station",      "Tom Mboya Street, Nairobi CBD",       "0700000001",  99),
        ("Westlands",        "Sarit Centre, Westlands",              "0700000002", 149),
        ("Karen",            "The Hub Karen, Lang'ata Road",         "0700000003", 199),
        ("Eastleigh",        "Eastleigh, 1st Avenue",                "0700000004", 129),
    ],
    "Mombasa": [
        ("CBD – Moi Avenue", "Moi Avenue, Mombasa CBD",              "0711000001", 149),
        ("Nyali",            "Nyali Centre, Links Road",             "0711000002", 179),
        ("Likoni",           "Likoni Shopping Centre",               "0711000003", 169),
        ("Bamburi",          "Bamburi Beach Road",                   "0711000004", 189),
    ],
    "Kisumu": [
        ("CBD",              "Oginga Odinga Street",                 "0722000001", 149),
        ("Milimani",         "Milimani Road, Kisumu",                "0722000002", 179),
        ("Kondele",          "Kondele Market Area",                  "0722000003", 129),
        ("Nyalenda",         "Nyalenda B, Kisumu",                   "0722000004", 159),
    ],
    "Nakuru": [
        ("CBD",              "Kenyatta Avenue, Nakuru",              "0733000001", 149),
        ("Westside Mall",    "Westside Mall, Nakuru",                "0733000002", 169),
        ("Pipeline",         "Pipeline Area, Nakuru",                "0733000003", 139),
        ("Milimani",         "Milimani Road, Nakuru",                "0733000004", 159),
    ],
    "Murang'a": [
        ("Town Centre",      "Murang'a Town, Main Street",           "0744000001", 159),
        ("Kenol",            "Kenol Town, Thika Road",               "0744000002", 179),
        ("Kangema",          "Kangema Town Centre",                  "0744000003", 169),
    ],
    "Kiambu": [
        ("Thika – CBD",      "Commercial Street, Thika",             "0755000001", 129),
        ("Ruiru",            "Ruiru Town, Kamiti Road",              "0755000002", 149),
        ("Limuru",           "Limuru Town Centre",                   "0755000003", 169),
        ("Kikuyu",           "Kikuyu Town, Ondiri Road",             "0755000004", 139),
    ],
    "Machakos": [
        ("Machakos Town",    "Machakos Town, Main Avenue",           "0766000001", 159),
        ("Athi River",       "Athi River, Mombasa Road",             "0766000002", 149),
        ("Kangundo",         "Kangundo Town Centre",                 "0766000003", 179),
    ],
    "Eldoret": [
        ("CBD",              "Uganda Road, Eldoret",                 "0777000001", 159),
        ("Langas",           "Langas Area, Eldoret",                 "0777000002", 179),
        ("Pioneer",          "Pioneer Estate, Eldoret",              "0777000003", 169),
        ("Huruma",           "Huruma Road, Eldoret",                 "0777000004", 189),
    ],
    "Nyeri": [
        ("CBD",              "Kimathi Way, Nyeri",                   "0788000001", 169),
        ("Karatina",         "Karatina Market, Nyeri County",        "0788000002", 179),
        ("Othaya",           "Othaya Town, Nyeri County",            "0788000003", 189),
    ],
    "Meru": [
        ("Meru Town",        "Meru Town, Kenyatta Highway",          "0799000001", 169),
        ("Nkubu",            "Nkubu Town Centre",                    "0799000002", 179),
        ("Timau",            "Timau Town, Meru-Nanyuki Rd",          "0799000003", 189),
    ],
    "Kakamega": [
        ("CBD",              "Kakamega Town, Atwoli Road",           "0710100001", 169),
        ("Mumias",           "Mumias Town Centre",                   "0710100002", 189),
        ("Butere",           "Butere Town Centre",                   "0710100003", 179),
    ],
    "Kericho": [
        ("CBD",              "Kericho Town, Moi Highway",            "0720100001", 169),
        ("Litein",           "Litein Town Centre",                   "0720100002", 189),
        ("Londiani",         "Londiani Town Centre",                 "0720100003", 179),
    ],
    "Embu": [
        ("CBD",              "Embu Town, Kenyatta Highway",          "0730100001", 169),
        ("Runyenjes",        "Runyenjes Town Centre",                "0730100002", 189),
        ("Siakago",          "Siakago Town Centre",                  "0730100003", 179),
    ],
    "Kilifi": [
        ("CBD",              "Kilifi Town, Mnarani Road",            "0750100001", 169),
        ("Malindi",          "Malindi Town, Lamu Road",              "0750100002", 179),
        ("Watamu",           "Watamu Town Centre",                   "0750100003", 199),
    ],
    "Garissa": [
        ("CBD",              "Garissa Town, Hospital Road",          "0740100001", 199),
        ("Bura",             "Bura Town Centre",                     "0740100002", 209),
        ("Dadaab",           "Dadaab Town Centre",                   "0740100003", 219),
    ],
}

CATEGORIES_DATA = [
    ("Electronics",        "laptop",      ["Phones & Tablets", "Computers", "TVs & Audio", "Cameras", "Gaming"]),
    ("Fashion",            "bag-heart",   ["Men's Clothing", "Women's Clothing", "Shoes", "Bags & Wallets", "Watches"]),
    ("Home & Living",      "house",       ["Furniture", "Kitchen", "Bedding", "Decor", "Lighting"]),
    ("Health & Beauty",    "heart-pulse", ["Skin Care", "Hair Care", "Fragrances", "Vitamins", "Baby Care"]),
    ("Sports",             "bicycle",     ["Exercise Equipment", "Outdoor", "Team Sports", "Sportswear"]),
    ("Automotive",         "car-front",   ["Car Accessories", "Motorbike Parts", "Car Care"]),
    ("Books & Stationery", "book",        ["Textbooks", "Fiction", "Office Supplies", "Art Supplies"]),
    ("Groceries",          "cart3",       ["Fresh Produce", "Beverages", "Snacks", "Cooking Essentials"]),
    ("Toys & Kids",        "puzzle",      ["Toys", "Baby Gear", "School Bags", "Kids Clothing"]),
    ("Computing",          "pc-display",  ["Laptops", "Desktops", "Printers", "Networking", "Storage"]),
]

BRANDS_DATA = [
    "Samsung", "Apple", "Tecno", "Infinix", "Itel",
    "HP", "Dell", "Lenovo", "Asus", "Acer",
    "Sony", "LG", "Hisense", "Ramtons", "Von",
    "Nike", "Adidas", "Puma", "Fila", "New Balance",
    "Safaricom", "Jumbo", "Orbit", "Zara", "H&M",
]

PRODUCTS_DATA = [
    {
        "name": "Samsung Galaxy A55 5G 256GB",
        "sku": "SAM-A55-256",
        "category": "Phones & Tablets", "brand": "Samsung",
        "price": 45000, "compare_price": 52000, "stock": 42,
        "image_hint": "phone",
        "short_description": "6.6-inch Super AMOLED, 50MP camera, 5000mAh battery",
        "description": (
            "The Samsung Galaxy A55 5G features a stunning 6.6-inch Super AMOLED display "
            "with 120Hz refresh rate. Powered by the Exynos 1480 processor with 8GB RAM and "
            "256GB internal storage. 50MP main camera. 5000mAh with 25W fast charging."
        ),
        "specs": [
            ("Display", "6.6-inch Super AMOLED 120Hz"), ("Processor", "Exynos 1480 Octa-core"),
            ("RAM", "8GB"), ("Storage", "256GB (expandable)"),
            ("Camera", "50MP + 12MP + 5MP"), ("Battery", "5000mAh, 25W Fast Charge"),
            ("OS", "Android 14, One UI 6.1"), ("5G", "Yes"),
        ],
        "variants": [
            ("Color", "Awesome Navy", "NV", 0),
            ("Color", "Awesome Lilac", "LL", 0),
            ("Color", "Awesome Iceblue", "IB", 0),
        ],
        "is_featured": True, "is_flash_sale": True, "flash_sale_price": 41000,
    },
    {
        "name": "Tecno Spark 20 Pro+ 256GB",
        "sku": "TEC-SP20P-256",
        "category": "Phones & Tablets", "brand": "Tecno",
        "price": 22000, "compare_price": 26000, "stock": 78,
        "image_hint": "phone",
        "short_description": "6.67-inch AMOLED, 108MP camera, 5000mAh",
        "description": "Tecno Spark 20 Pro+ — flagship features at an affordable price. 108MP main camera.",
        "specs": [
            ("Display", "6.67-inch AMOLED 120Hz"), ("Camera", "108MP + 8MP + 2MP"),
            ("RAM", "8GB"), ("Storage", "256GB"),
            ("Battery", "5000mAh, 33W"), ("OS", "Android 13, HiOS 13"),
        ],
        "variants": [
            ("Color", "Starfall Black", "BK", 0),
            ("Color", "Moonlight Silver", "SV", 0),
        ],
        "is_featured": True,
    },
    {
        "name": "Infinix Hot 40i 128GB",
        "sku": "INF-H40I-128",
        "category": "Phones & Tablets", "brand": "Infinix",
        "price": 13500, "compare_price": 16000, "stock": 120,
        "image_hint": "phone",
        "short_description": "6.56-inch IPS LCD, 50MP, 5000mAh",
        "description": "Infinix Hot 40i — reliable budget smartphone with 50MP AI camera and 5000mAh battery.",
        "specs": [
            ("Display", "6.56-inch IPS LCD"), ("Camera", "50MP + 2MP"),
            ("RAM", "4GB + 4GB extended"), ("Storage", "128GB"), ("Battery", "5000mAh"),
        ],
        "variants": [],
    },
    {
        "name": "HP Pavilion 15 Core i5 12th Gen 512GB SSD",
        "sku": "HP-PAV15-I5-512",
        "category": "Computers", "brand": "HP",
        "price": 75000, "compare_price": 88000, "stock": 25,
        "image_hint": "laptop",
        "short_description": "15.6-inch FHD, Intel Core i5-1235U, 8GB RAM, 512GB SSD",
        "description": "HP Pavilion 15 — 12th Gen Intel Core i5, backlit keyboard, fingerprint reader.",
        "specs": [
            ("Processor", "Intel Core i5-1235U, 12th Gen"), ("RAM", "8GB DDR4"),
            ("Storage", "512GB NVMe SSD"), ("Display", "15.6-inch FHD IPS Anti-glare"),
            ("Graphics", "Intel Iris Xe"), ("OS", "Windows 11 Home"),
            ("Battery", "41Wh, up to 7 hours"),
        ],
        "variants": [("RAM", "8GB", "8G", 0), ("RAM", "16GB", "16G", 8000)],
        "is_featured": True,
    },
    {
        "name": "Lenovo IdeaPad 3 AMD Ryzen 5 512GB",
        "sku": "LEN-IP3-R5-512",
        "category": "Computers", "brand": "Lenovo",
        "price": 68000, "compare_price": 79000, "stock": 18,
        "image_hint": "laptop",
        "short_description": "15.6-inch FHD, AMD Ryzen 5 5500U, 8GB RAM",
        "description": "Lenovo IdeaPad 3 AMD Ryzen 5 — smooth performance, Dolby Audio, WiFi 6.",
        "specs": [
            ("Processor", "AMD Ryzen 5 5500U"), ("RAM", "8GB DDR4"),
            ("Storage", "512GB SSD"), ("Display", "15.6-inch FHD IPS"),
            ("Graphics", "AMD Radeon RX Vega 7"), ("OS", "Windows 11"),
        ],
        "variants": [],
        "is_featured": True,
    },
    {
        "name": "Hisense 43-inch 4K UHD Smart TV",
        "sku": "HIS-43A7H-4K",
        "category": "TVs & Audio", "brand": "Hisense",
        "price": 38000, "compare_price": 45000, "stock": 30,
        "image_hint": "tv",
        "short_description": "43-inch 4K, Android TV, Dolby Vision, HDR10",
        "description": "Brilliant 4K with Dolby Vision and HDR10. Android TV with Netflix, YouTube, Chromecast.",
        "specs": [
            ("Screen Size", "43 inches"), ("Resolution", "3840 x 2160 (4K UHD)"),
            ("HDR", "Dolby Vision, HDR10, HLG"), ("OS", "Android TV 10"),
            ("HDMI", "3 ports"), ("USB", "2 ports"), ("WiFi", "Dual-band 2.4GHz / 5GHz"),
        ],
        "variants": [],
        "is_featured": True, "is_flash_sale": True, "flash_sale_price": 34000,
    },
    {
        "name": "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
        "sku": "SNY-WH1000XM5-BK",
        "category": "TVs & Audio", "brand": "Sony",
        "price": 42000, "compare_price": 55000, "stock": 12,
        "image_hint": "headphones",
        "short_description": "Industry-leading noise cancellation, 30hr battery, LDAC",
        "description": "Sony WH-1000XM5 — 8 microphones, 2 processors, 30-hour battery, multipoint connection.",
        "specs": [
            ("Driver", "30mm"), ("Battery", "30 hours ANC on"),
            ("Noise Cancelling", "Yes — 8 mics, 2 processors"),
            ("Codec", "LDAC, AAC, SBC"), ("Weight", "250g"), ("Connection", "Bluetooth 5.2"),
        ],
        "variants": [("Color", "Black", "BK", 0), ("Color", "Silver", "SV", 0)],
        "is_featured": True, "is_flash_sale": True, "flash_sale_price": 36000,
    },
    {
        "name": "Apple AirPods Pro 2nd Generation",
        "sku": "APL-APP2-WH",
        "category": "TVs & Audio", "brand": "Apple",
        "price": 32000, "compare_price": 38000, "stock": 20,
        "image_hint": "headphones",
        "short_description": "Active noise cancellation, Transparency mode, H2 chip",
        "description": "AirPods Pro (2nd gen) — H2 chip, 2x more ANC, 6hrs + 30hrs with case, IPX4.",
        "specs": [
            ("Chip", "Apple H2"), ("ANC", "Active Noise Cancellation"),
            ("Battery (buds)", "6 hours"), ("Battery (with case)", "30 hours"),
            ("Resistance", "IPX4"), ("Connectivity", "Bluetooth 5.3"),
        ],
        "variants": [],
        "is_featured": True,
    },
    {
        "name": "Nike Air Max 270 React Men's Sneakers",
        "sku": "NIK-AM270-BK-42",
        "category": "Shoes", "brand": "Nike",
        "price": 12500, "compare_price": 15000, "stock": 55,
        "image_hint": "shoes",
        "short_description": "Lightweight running shoe with Max Air cushioning",
        "description": "Nike Air Max 270 React — Max Air + React foam, breathable mesh upper.",
        "specs": [
            ("Material", "Mesh upper, rubber sole"), ("Closure", "Lace-up"),
            ("Heel Height", "Max Air unit (~32mm)"), ("Weight", "Approx 280g"),
        ],
        "variants": [
            ("Size", "39", "39", 0), ("Size", "40", "40", 0), ("Size", "41", "41", 0),
            ("Size", "42", "42", 0), ("Size", "43", "43", 0), ("Size", "44", "44", 0),
            ("Size", "45", "45", 0),
        ],
        "is_featured": True,
    },
    {
        "name": "Adidas Ultraboost 22 Running Shoes",
        "sku": "ADI-UB22-WH-41",
        "category": "Shoes", "brand": "Adidas",
        "price": 14000, "compare_price": 17500, "stock": 38,
        "image_hint": "shoes",
        "short_description": "BOOST midsole, Primeknit upper, high energy return",
        "description": "Adidas Ultraboost 22 — BOOST cushioning, Primeknit+ upper, Continental rubber outsole.",
        "specs": [
            ("Upper", "Primeknit+"), ("Midsole", "BOOST"),
            ("Outsole", "Continental Rubber"), ("Drop", "10mm"),
        ],
        "variants": [
            ("Size", "38", "38", 0), ("Size", "39", "39", 0), ("Size", "40", "40", 0),
            ("Size", "41", "41", 0), ("Size", "42", "42", 0), ("Size", "43", "43", 0),
        ],
        "is_featured": True,
    },
    {
        "name": "Ramtons 4-Slice Stainless Steel Toaster",
        "sku": "RAM-TS4-SS",
        "category": "Kitchen", "brand": "Ramtons",
        "price": 3200, "compare_price": 4000, "stock": 90,
        "image_hint": "kitchen",
        "short_description": "4-slice toaster, 7 browning settings, removable crumb tray",
        "description": "Ramtons 4-slice toaster — 7 browning levels, cancel/defrost/reheat, 1500W, stainless steel.",
        "specs": [
            ("Slices", "4"), ("Power", "1500W"), ("Browning Levels", "7"),
            ("Material", "Stainless Steel"), ("Functions", "Toast, Defrost, Reheat, Cancel"),
        ],
        "variants": [],
        "is_featured": True, "is_flash_sale": True, "flash_sale_price": 2800,
    },
    {
        "name": "Von Hotpoint 5-Burner Gas Cooker + Oven",
        "sku": "VON-GC5BK-SS",
        "category": "Kitchen", "brand": "Von",
        "price": 28000, "compare_price": 33000, "stock": 15,
        "image_hint": "kitchen",
        "short_description": "60x60cm, 5 burners, electric ignition, auto-shut",
        "description": "Von Hotpoint 5-burner gas cooker — auto ignition, 67L oven, rotisserie included, LPG.",
        "specs": [
            ("Burners", "5 (1 triple crown, 2 semi-rapid, 2 auxiliary)"),
            ("Oven Capacity", "67 litres"), ("Ignition", "Electric auto ignition"),
            ("Gas Type", "LPG"), ("Dimensions", "60 x 60 x 86 cm"),
        ],
        "variants": [],
    },
    {
        "name": "Nivea Men Sensitive Moisturiser 75ml",
        "sku": "NIV-MEN-SENS-75",
        "category": "Skin Care", "brand": "Orbit",
        "price": 850, "compare_price": 1100, "stock": 200,
        "image_hint": "beauty",
        "short_description": "Soothing face cream for sensitive skin, SPF 15",
        "description": "Nivea Men Sensitive — chamomile, vitamin E, SPF 15, alcohol-free, dermatologist tested.",
        "specs": [
            ("Volume", "75ml"), ("SPF", "15"),
            ("Skin Type", "Sensitive"), ("Key Ingredients", "Chamomile extract, Vitamin E"),
        ],
        "variants": [],
    },
    {
        "name": "Body Power 20kg Adjustable Dumbbell Set",
        "sku": "BPW-DB20-SET",
        "category": "Exercise Equipment", "brand": "Jumbo",
        "price": 8500, "compare_price": 11000, "stock": 40,
        "image_hint": "sports",
        "short_description": "20kg cast iron dumbbell set with adjustable plates",
        "description": "Complete dumbbell set — two chrome handles + rubber-coated cast iron plates, spin-lock collars.",
        "specs": [
            ("Total Weight", "20kg"), ("Handle Material", "Chrome steel"),
            ("Plates", "Cast iron rubber coated"), ("Collar Type", "Spin-lock"),
        ],
        "variants": [],
        "is_featured": True, "is_flash_sale": True, "flash_sale_price": 7200,
    },
    {
        "name": "HP 2TB External Hard Drive USB 3.0",
        "sku": "HP-EHD-2TB-BK",
        "category": "Storage", "brand": "HP",
        "price": 7500, "compare_price": 9000, "stock": 65,
        "image_hint": "laptop",
        "short_description": "2TB portable HDD, USB 3.0, plug & play",
        "description": "HP 2TB portable external HDD — USB 3.0, no external power needed, Windows + macOS.",
        "specs": [
            ("Capacity", "2TB"), ("Interface", "USB 3.0"),
            ("Transfer Speed", "Up to 5Gbps"), ("Compatibility", "Windows 10/11, macOS 10.13+"),
            ("Dimensions", "110 x 79 x 15mm"),
        ],
        "variants": [("Color", "Black", "BK", 0), ("Color", "Silver", "SV", 500)],
    },
    {
        "name": "Mumias Extra Fine Sugar 2kg",
        "sku": "MUM-SUGAR-2KG",
        "category": "Cooking Essentials", "brand": "Jumbo",
        "price": 280, "compare_price": None, "stock": 500,
        "image_hint": "food",
        "short_description": "Premium refined white sugar, 2kg bag",
        "description": "Mumias Extra Fine Sugar — Kenya's finest sugar brand. 2kg resealable bag.",
        "specs": [("Weight", "2kg"), ("Type", "Extra Fine Refined White Sugar")],
        "variants": [],
    },
    {
        "name": "Brookside Lala Yoghurt 500g",
        "sku": "BRK-LALA-STRAW-500",
        "category": "Beverages", "brand": "Jumbo",
        "price": 120, "compare_price": None, "stock": 300,
        "image_hint": "food",
        "short_description": "Strawberry flavour fermented yoghurt, 500g",
        "description": "Brookside Lala — refreshing fermented yoghurt, rich in probiotics.",
        "specs": [
            ("Weight", "500g"), ("Flavour", "Strawberry"),
            ("Storage", "Keep refrigerated below 8°C"),
        ],
        "variants": [
            ("Flavour", "Strawberry", "STR", 0),
            ("Flavour", "Mango",      "MNG", 0),
            ("Flavour", "Passion",    "PAS", 0),
        ],
    },
    {
        "name": "Michelin Pilot Sport 4 Tyre 225/45 R17",
        "sku": "MCH-PS4-225-45-R17",
        "category": "Car Accessories", "brand": "Jumbo",
        "price": 18500, "compare_price": 22000, "stock": 20,
        "image_hint": "car",
        "short_description": "Ultra-high performance tyre, wet & dry grip",
        "description": "Michelin Pilot Sport 4 — exceptional wet braking, precise steering for performance cars.",
        "specs": [
            ("Size", "225/45 R17"), ("Load Index", "91"),
            ("Speed Rating", "Y (300 km/h)"), ("Season", "Summer"),
        ],
        "variants": [],
    },
    {
        "name": "LEGO Classic 1000-Piece Creative Brick Set",
        "sku": "LEG-CLASS-1000",
        "category": "Toys", "brand": "Jumbo",
        "price": 5500, "compare_price": 7000, "stock": 35,
        "image_hint": "toy",
        "short_description": "1000 colorful bricks for unlimited creativity, ages 4+",
        "description": "LEGO Classic 1000-piece set — 33 colours, storage box included. Ages 4+.",
        "specs": [("Pieces", "1000"), ("Ages", "4+"), ("Dimensions (box)", "38 x 26 x 8 cm")],
        "variants": [],
        "is_featured": True, "is_flash_sale": True, "flash_sale_price": 4800,
    },
    {
        "name": "Rich Dad Poor Dad – Robert Kiyosaki",
        "sku": "BK-RDPD-EN",
        "category": "Fiction", "brand": "Jumbo",
        "price": 1200, "compare_price": 1600, "stock": 150,
        "image_hint": "book",
        "short_description": "Bestselling personal finance book, paperback",
        "description": "Rich Dad Poor Dad — #1 personal finance book. Lessons on money, investing, independence.",
        "specs": [
            ("Author", "Robert T. Kiyosaki"), ("Pages", "336"),
            ("Publisher", "Plata Publishing"), ("Language", "English"), ("Format", "Paperback"),
        ],
        "variants": [],
    },
]

COUPONS_DATA = [
    {"code": "WELCOME10", "discount_type": "percent", "discount_value": 10,  "minimum_order": 1000,  "max_uses": 1000},
    {"code": "SAVE500",   "discount_type": "fixed",   "discount_value": 500, "minimum_order": 3000,  "max_uses": 500},
    {"code": "FLASH25",   "discount_type": "percent", "discount_value": 25,  "minimum_order": 5000,  "max_uses": 200},
    {"code": "FREESHIP",  "discount_type": "fixed",   "discount_value": 200, "minimum_order": 2000,  "max_uses": 1000},
    {"code": "MGOBAL15",  "discount_type": "percent", "discount_value": 15,  "minimum_order": 2500,  "max_uses": 500},
]

DEMO_USERS_DATA = [
    ("john_doe",     "John",  "Doe",    "john@example.com",  "0712345678", "Demo@1234"),
    ("jane_mwangi",  "Jane",  "Mwangi", "jane@example.com",  "0723456789", "Demo@1234"),
    ("ali_hassan",   "Ali",   "Hassan", "ali@example.com",   "0734567890", "Demo@1234"),
    ("mary_wanjiku", "Mary",  "Wanjiku","mary@example.com",  "0745678901", "Demo@1234"),
]


# ─────────────────────────────────────────────────────────────────────────────
#  Management Command
# ─────────────────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Seed Mgobal database: counties, categories, brands, products, coupons, banners, users"

    def add_arguments(self, parser):
        parser.add_argument(
            "--module",
            choices=["counties", "categories", "brands", "products",
                     "coupons", "banners", "users", "all"],
            default="all",
            help="Which module to seed (default: all)",
        )
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete existing data for chosen module before re-seeding",
        )
        parser.add_argument(
            "--images",
            type=str,
            default=None,
            metavar="PATH",
            help=r"Local images folder path (e.g. D:\gadaf\Documents\images\jumia)",
        )
        parser.add_argument(
            "--no-images",
            action="store_true",
            dest="no_images",
            help="Skip all image handling — seed text data only",
        )

    # ── entry point ───────────────────────────────────────────────────────────

    def handle(self, *args, **options):
        from django.conf import settings as dj_settings

        module    = options["module"]
        flush     = options["flush"]
        no_images = options["no_images"]
        img_path  = options["images"]

        # ── Build ImageManager — pass style methods, NOT stdout.style ─────────
        self.imgs = ImageManager(
            media_root = Path(dj_settings.MEDIA_ROOT),
            source_dir = img_path,
            no_images  = no_images,
            write      = self.stdout.write,          # callable
            success    = self.style.SUCCESS,         # callable
            warning    = self.style.WARNING,         # callable
        )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("═" * 58))
        self.stdout.write(self.style.SUCCESS("  🌱  Mgobal Seed Command"))
        self.stdout.write(self.style.SUCCESS("═" * 58))

        if flush:
            self._flush(module)

        run_all = (module == "all")

        if run_all or module == "counties":
            self.stdout.write(self.style.HTTP_INFO("\n[1] Counties & Pickup Stations"))
            self._seed_counties()

        if run_all or module == "categories":
            self.stdout.write(self.style.HTTP_INFO("\n[2] Categories"))
            self._seed_categories()

        if run_all or module == "brands":
            self.stdout.write(self.style.HTTP_INFO("\n[3] Brands"))
            self._seed_brands()

        if run_all or module == "products":
            self.stdout.write(self.style.HTTP_INFO("\n[4] Products"))
            self._seed_products()

        if run_all or module == "coupons":
            self.stdout.write(self.style.HTTP_INFO("\n[5] Coupons"))
            self._seed_coupons()

        if run_all or module == "banners":
            self.stdout.write(self.style.HTTP_INFO("\n[6] Banners"))
            self._seed_banners()

        if run_all or module == "users":
            self.stdout.write(self.style.HTTP_INFO("\n[7] Users"))
            self._seed_superuser()
            self._seed_demo_users()

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("═" * 58))
        self.stdout.write(self.style.SUCCESS("  ✅  Seeding complete!"))
        self.stdout.write(self.style.SUCCESS("═" * 58))
        self.stdout.write(self.style.WARNING(
            "\n  Admin  →  http://localhost:8000/admin/  |  admin / Admin@1234"
            "\n  Users  →  john_doe / Demo@1234   jane_mwangi / Demo@1234"
            "\n  Coupons→  WELCOME10  SAVE500  FLASH25  FREESHIP  MGOBAL15\n"
        ))

    # ── flush ─────────────────────────────────────────────────────────────────

    def _flush(self, module):
        from core.models import County, PickupStation, Category, Brand, Product, Coupon, Banner
        self.stdout.write(self.style.WARNING("\n  ⚠  Flushing existing data…"))
        targets = {
            "counties":   [PickupStation, County],
            "categories": [Category],
            "brands":     [Brand],
            "products":   [Product],
            "coupons":    [Coupon],
            "banners":    [Banner],
            "users":      [],
            "all":        [Product, Banner, Coupon, Brand, Category, PickupStation, County],
        }
        for model in targets.get(module, []):
            n = model.objects.count()
            model.objects.all().delete()
            self.stdout.write(f"    🗑  Deleted {n} {model.__name__} records")

    # ── seed helpers ──────────────────────────────────────────────────────────

    def _seed_superuser(self):
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(
                username="admin", email="admin@mgobal.co.ke",
                password="Admin@1234", first_name="Mgobal",
                last_name="Admin", phone="0700000000",
            )
            self.stdout.write(self.style.SUCCESS("  ✅ admin / Admin@1234 created"))
        else:
            self.stdout.write("  ⏭  Superuser already exists")

    def _seed_demo_users(self):
        created = 0
        for username, first, last, email, phone, password in DEMO_USERS_DATA:
            if not User.objects.filter(username=username).exists():
                User.objects.create_user(
                    username=username, email=email, password=password,
                    first_name=first, last_name=last, phone=phone,
                )
                self.stdout.write(f"  👤 {username} / {password}")
                created += 1
        self.stdout.write(self.style.SUCCESS(
            f"  ✅ {created} demo users created (total: {User.objects.count()})"
        ))

    def _seed_counties(self):
        from core.models import County, PickupStation
        for county_name, stations in COUNTIES_DATA.items():
            county, created = County.objects.get_or_create(name=county_name)
            tag = "  ✅" if created else "  ⏭ "
            self.stdout.write(f"{tag} {county_name}")
            for s_name, s_addr, s_phone, s_fee in stations:
                PickupStation.objects.get_or_create(
                    county=county, name=s_name,
                    defaults={"address": s_addr, "phone": s_phone, "fee": s_fee},
                )
        self.stdout.write(self.style.SUCCESS(
            f"  ✅ {County.objects.count()} counties, "
            f"{PickupStation.objects.count()} pickup stations"
        ))

    def _seed_categories(self):
        from core.models import Category
        for idx, (name, icon, children) in enumerate(CATEGORIES_DATA):
            parent, created = Category.objects.get_or_create(
                name=name,
                defaults={
                    "slug": slugify(name), "icon": icon,
                    "meta_title": f"{name} — Best Prices in Kenya | Mgobal",
                    "meta_description": f"Shop {name} at the best prices. Fast delivery to all 47 counties.",
                    "is_active": True, "order": idx,
                },
            )
            if created:
                img = self.imgs.get_one("categories", "home")
                if img:
                    parent.image = img
                    parent.save(update_fields=["image"])
            for child_name in children:
                Category.objects.get_or_create(
                    name=child_name,
                    defaults={"slug": slugify(child_name), "parent": parent, "is_active": True},
                )
        self.stdout.write(self.style.SUCCESS(f"  ✅ {Category.objects.count()} categories seeded"))

    def _seed_brands(self):
        from core.models import Brand
        created = sum(
            1 for name in BRANDS_DATA
            if Brand.objects.get_or_create(name=name, defaults={"slug": slugify(name)})[1]
        )
        self.stdout.write(self.style.SUCCESS(
            f"  ✅ {created} new brands (total: {Brand.objects.count()})"
        ))

    def _seed_products(self):
        from core.models import (
            Category, Brand, Product,
            ProductImage, ProductVariant, ProductSpecification,
        )
        flash_end = timezone.now() + timedelta(hours=12)
        created   = 0

        for data in PRODUCTS_DATA:
            if Product.objects.filter(sku=data["sku"]).exists():
                self.stdout.write(f"  ⏭  {data['sku']}")
                continue

            try:
                category = Category.objects.get(name=data["category"])
            except Category.DoesNotExist:
                category = Category.objects.filter(is_active=True).first()

            brand = Brand.objects.filter(name=data["brand"]).first()
            slug  = f"{slugify(data['name'])}-{data['sku'].lower()}"

            product = Product.objects.create(
                name=data["name"], slug=slug, sku=data["sku"],
                category=category, brand=brand,
                price=data["price"],
                compare_price=data.get("compare_price"),
                stock=data["stock"],
                short_description=data.get("short_description", ""),
                description=data["description"],
                is_active=True,
                is_featured=data.get("is_featured", False),
                is_flash_sale=data.get("is_flash_sale", False),
                flash_sale_price=data.get("flash_sale_price"),
                flash_sale_end=flash_end if data.get("is_flash_sale") else None,
                meta_title=f"{data['name']} — Best Price in Kenya | Mgobal",
                meta_description=data.get("short_description", data["description"][:160]),
                meta_keywords=f"{data['name']}, {data['brand']}, {data['category']}, kenya",
            )

            # 3 images, first is primary
            hint = data.get("image_hint", "default")
            for i, img_path in enumerate(self.imgs.get_many("products", n=3, hint=hint)):
                ProductImage.objects.create(
                    product=product, image=img_path,
                    alt_text=product.name, is_primary=(i == 0), order=i,
                )

            for key, value in data.get("specs", []):
                ProductSpecification.objects.create(product=product, key=key, value=value)

            for v_name, v_value, v_suffix, v_adj in data.get("variants", []):
                ProductVariant.objects.create(
                    product=product, name=v_name, value=v_value,
                    sku_suffix=v_suffix, price_adjustment=v_adj,
                    stock=random.randint(5, 30),
                )

            self.stdout.write(f"  ✅ {product.name}")
            created += 1

        self.stdout.write(self.style.SUCCESS(
            f"  ✅ {created} products created (total: {Product.objects.count()})"
        ))

    def _seed_coupons(self):
        from core.models import Coupon
        created = 0
        for c in COUPONS_DATA:
            _, made = Coupon.objects.get_or_create(
                code=c["code"],
                defaults={
                    "discount_type":  c["discount_type"],
                    "discount_value": c["discount_value"],
                    "minimum_order":  c["minimum_order"],
                    "valid_from":     timezone.now(),
                    "valid_to":       timezone.now() + timedelta(days=365),
                    "is_active":      True,
                    "max_uses":       c["max_uses"],
                },
            )
            if made:
                self.stdout.write(f"  🎫 {c['code']}  ({c['discount_type']} {c['discount_value']})")
                created += 1
        self.stdout.write(self.style.SUCCESS(
            f"  ✅ {created} new coupons (total: {Coupon.objects.count()})"
        ))

    def _seed_banners(self):
        from core.models import Banner
        banners = [
            {"title": "Massive Tech Sale",   "subtitle": "Up to 50% off on Electronics",  "link": "/category/electronics",       "order": 1},
            {"title": "Fashion Forward",      "subtitle": "New arrivals every week",        "link": "/category/fashion",            "order": 2},
            {"title": "Home & Living Deals",  "subtitle": "Transform your space",           "link": "/category/home-living",        "order": 3},
            {"title": "Flash Sale Today",     "subtitle": "Limited time — grab it fast",    "link": "/products?is_flash_sale=true", "order": 4},
        ]
        created = 0
        for b in banners:
            _, made = Banner.objects.get_or_create(
                title=b["title"],
                defaults={
                    "subtitle":  b["subtitle"],
                    "link":      b["link"],
                    "order":     b["order"],
                    "is_active": True,
                    "image":     self.imgs.get_one("banners", "default") or "",
                },
            )
            if made:
                self.stdout.write(f"  🖼  {b['title']}")
                created += 1
        self.stdout.write(self.style.SUCCESS(
            f"  ✅ {created} new banners (total: {Banner.objects.count()})"
        ))