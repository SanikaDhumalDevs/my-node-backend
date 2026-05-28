# PredictExpiry.py
import sys
import json
import os
from datetime import datetime, timedelta
import difflib
import requests
from dotenv import load_dotenv

# =========================
# Environment & Defaults
# =========================
load_dotenv()
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
DEBUG = os.getenv("DEBUG", "0") == "1"

DEFAULT_CITY = "Delhi"
DEFAULT_COUNTRY = "IN"

# Defaults per category
DEFAULT_STORAGE_BY_CATEGORY = {
    "food": "refrigerated",
    "medicine": "ambient",
    "product": "ambient",
}
DEFAULT_OPENED = "sealed"  # opened | sealed

def dlog(msg: str):
    if DEBUG:
        sys.stderr.write(f"[DEBUG] {msg}\n")

# =========================
# Knowledge Bases
# (days; typical guidance)
# =========================

# ---- FOOD (expanded) ----
FOOD_DB = {
    # Milk & dairy
    "milk": {
        "ambient": {"sealed": 1, "opened": 1},
        "refrigerated": {"sealed": 7, "opened": 4},
        "frozen": {"sealed": 90, "opened": 90},
    },
    "uht milk": {
        "ambient": {"sealed": 180, "opened": 4},
        "refrigerated": {"sealed": 180, "opened": 4},
        "frozen": {"sealed": 0, "opened": 0},
    },
    "curd": {
        "ambient": {"sealed": 1, "opened": 1},
        "refrigerated": {"sealed": 14, "opened": 5},
        "frozen": {"sealed": 60, "opened": 60},
    },
    "yogurt": {
        "ambient": {"sealed": 1, "opened": 1},
        "refrigerated": {"sealed": 14, "opened": 5},
        "frozen": {"sealed": 60, "opened": 60},
    },
    "paneer": {
        "ambient": {"sealed": 1, "opened": 1},
        "refrigerated": {"sealed": 7, "opened": 3},
        "frozen": {"sealed": 60, "opened": 60},
    },
    "cheese (soft)": {
        "ambient": {"sealed": 0, "opened": 0},
        "refrigerated": {"sealed": 14, "opened": 7},
        "frozen": {"sealed": 90, "opened": 90},
    },
    "cheese (hard)": {
        "ambient": {"sealed": 0, "opened": 0},
        "refrigerated": {"sealed": 60, "opened": 30},
        "frozen": {"sealed": 180, "opened": 180},
    },

    # Bakery
    "bread": {
        "ambient": {"sealed": 5, "opened": 5},
        "refrigerated": {"sealed": 7, "opened": 7},
        "frozen": {"sealed": 90, "opened": 90},
    },
    "bakery cake": {
        "ambient": {"sealed": 2, "opened": 2},
        "refrigerated": {"sealed": 5, "opened": 3},
        "frozen": {"sealed": 90, "opened": 90},
    },
    "biscuits": {
        "ambient": {"sealed": 120, "opened": 30},
        "refrigerated": {"sealed": 150, "opened": 45},
        "frozen": {"sealed": 0, "opened": 0},
    },
    "papad": {
        "ambient": {"sealed": 180, "opened": 120},
        "refrigerated": {"sealed": 240, "opened": 180},
        "frozen": {"sealed": 0, "opened": 0},
    },

    # Fresh produce
    "banana": {
        "ambient": {"sealed": 4, "opened": 4},
        "refrigerated": {"sealed": 6, "opened": 6},
        "frozen": {"sealed": 90, "opened": 90},
    },
    "apple": {
        "ambient": {"sealed": 10, "opened": 10},
        "refrigerated": {"sealed": 30, "opened": 30},
        "frozen": {"sealed": 180, "opened": 180},
    },
    "leafy greens": {
        "ambient": {"sealed": 1, "opened": 1},
        "refrigerated": {"sealed": 5, "opened": 3},
        "frozen": {"sealed": 90, "opened": 90},
    },
    "tomato": {
        "ambient": {"sealed": 5, "opened": 5},
        "refrigerated": {"sealed": 7, "opened": 7},
        "frozen": {"sealed": 0, "opened": 0},
    },
    "potato": {
        "ambient": {"sealed": 30, "opened": 30},
        "refrigerated": {"sealed": 45, "opened": 45},
        "frozen": {"sealed": 0, "opened": 0},
    },
    "onion": {
        "ambient": {"sealed": 30, "opened": 30},
        "refrigerated": {"sealed": 45, "opened": 45},
        "frozen": {"sealed": 0, "opened": 0},
    },

    # Frozen (veg & non-veg)
    "frozen vegetables": {
        "ambient": {"sealed": 0, "opened": 0},
        "refrigerated": {"sealed": 1, "opened": 1},
        "frozen": {"sealed": 270, "opened": 180},
    },
    "frozen chicken": {
        "ambient": {"sealed": 0, "opened": 0},
        "refrigerated": {"sealed": 1, "opened": 1},
        "frozen": {"sealed": 180, "opened": 120},
    },
    "frozen fish": {
        "ambient": {"sealed": 0, "opened": 0},
        "refrigerated": {"sealed": 1, "opened": 1},
        "frozen": {"sealed": 120, "opened": 90},
    },

    # Raw meats (fresh)
    "chicken (raw)": {
        "ambient": {"sealed": 0, "opened": 0},
        "refrigerated": {"sealed": 2, "opened": 2},
        "frozen": {"sealed": 180, "opened": 180},
    },
    "fish (raw)": {
        "ambient": {"sealed": 0, "opened": 0},
        "refrigerated": {"sealed": 2, "opened": 2},
        "frozen": {"sealed": 120, "opened": 120},
    },
    "meat (raw)": {
        "ambient": {"sealed": 0, "opened": 0},
        "refrigerated": {"sealed": 3, "opened": 3},
        "frozen": {"sealed": 180, "opened": 180},
    },
    "eggs": {
        "ambient": {"sealed": 14, "opened": 14},
        "refrigerated": {"sealed": 35, "opened": 35},
        "frozen": {"sealed": 0, "opened": 0},
    },

    # Cooked foods
    "cooked rice": {
        "ambient": {"sealed": 1, "opened": 1},
        "refrigerated": {"sealed": 4, "opened": 3},
        "frozen": {"sealed": 60, "opened": 60},
    },
    "leftovers (veg curry)": {
        "ambient": {"sealed": 1, "opened": 1},
        "refrigerated": {"sealed": 4, "opened": 3},
        "frozen": {"sealed": 60, "opened": 60},
    },

    # Packaged / pantry
    "instant noodles": {
        "ambient": {"sealed": 270, "opened": 30},
        "refrigerated": {"sealed": 270, "opened": 60},
        "frozen": {"sealed": 0, "opened": 0},
    },
    "chocolate": {
        "ambient": {"sealed": 365, "opened": 90},
        "refrigerated": {"sealed": 365, "opened": 120},
        "frozen": {"sealed": 0, "opened": 0},
    },
    "chips": {
        "ambient": {"sealed": 180, "opened": 7},
        "refrigerated": {"sealed": 240, "opened": 14},
        "frozen": {"sealed": 0, "opened": 0},
    },
    "jam": {
        "ambient": {"sealed": 365, "opened": 60},
        "refrigerated": {"sealed": 540, "opened": 120},
        "frozen": {"sealed": 0, "opened": 0},
    },
    "honey": {
        "ambient": {"sealed": 720, "opened": 360},
        "refrigerated": {"sealed": 720, "opened": 360},
        "frozen": {"sealed": 0, "opened": 0},
    },
    "tea": {
        "ambient": {"sealed": 720, "opened": 180},
        "refrigerated": {"sealed": 720, "opened": 240},
        "frozen": {"sealed": 0, "opened": 0},
    },
    "coffee": {
        "ambient": {"sealed": 360, "opened": 60},
        "refrigerated": {"sealed": 540, "opened": 120},
        "frozen": {"sealed": 720, "opened": 180},
    },
    "spices": {
        "ambient": {"sealed": 540, "opened": 180},
        "refrigerated": {"sealed": 720, "opened": 240},
        "frozen": {"sealed": 0, "opened": 0},
    },
    "canned food (unopened)": {
        "ambient": {"sealed": 720, "opened": 2},
        "refrigerated": {"sealed": 720, "opened": 5},
        "frozen": {"sealed": 0, "opened": 0},
    },
    "pickles": {
        "ambient": {"sealed": 365, "opened": 180},
        "refrigerated": {"sealed": 540, "opened": 270},
        "frozen": {"sealed": 0, "opened": 0},
    },
    "atta / flour": {
        "ambient": {"sealed": 90, "opened": 60},
        "refrigerated": {"sealed": 120, "opened": 90},
        "frozen": {"sealed": 0, "opened": 0},
    },
    "rice (uncooked)": {
        "ambient": {"sealed": 180, "opened": 120},
        "refrigerated": {"sealed": 240, "opened": 180},
        "frozen": {"sealed": 0, "opened": 0},
    },
    "dal (uncooked)": {
        "ambient": {"sealed": 180, "opened": 120},
        "refrigerated": {"sealed": 240, "opened": 180},
        "frozen": {"sealed": 0, "opened": 0},
    },
}

FOOD_ALIASES = {
    "dahi": "curd",
    "yoghurt": "yogurt",
    "hard cheese": "cheese (hard)",
    "soft cheese": "cheese (soft)",
    "long life milk": "uht milk",
    "cookies": "biscuits",
    "biscuit": "biscuits",
    "chapati": "bread",
    "flour": "atta / flour",
    "lentils": "dal (uncooked)",
    "raw chicken": "chicken (raw)",
    "raw fish": "fish (raw)",
    "raw meat": "meat (raw)",
    "frozen veg": "frozen vegetables",
}

FOOD_CATEGORY_DEFAULTS = {
    "food|ambient": 30,
    "food|refrigerated": 10,
    "food|frozen": 90,
    "produce|ambient": 5,
    "produce|refrigerated": 10,
    "meat|refrigerated": 3,
    "meat|frozen": 120,
}

# ---- MEDICINES (approximate typicals; days) ----
MED_DB = {
    "tablet":        {"ambient": {"sealed": 730, "opened": 730}},
    "capsule":       {"ambient": {"sealed": 730, "opened": 730}},
    "syrup":         {"ambient": {"sealed": 540, "opened": 30}, "refrigerated": {"sealed": 540, "opened": 45}},
    "suspension":    {"ambient": {"sealed": 540, "opened": 20}, "refrigerated": {"sealed": 540, "opened": 30}},
    "drops":         {"ambient": {"sealed": 365, "opened": 30}, "refrigerated": {"sealed": 365, "opened": 30}},
    "eye drops":     {"ambient": {"sealed": 365, "opened": 28}, "refrigerated": {"sealed": 365, "opened": 28}},
    "nasal spray":   {"ambient": {"sealed": 365, "opened": 60}},
    "ointment":      {"ambient": {"sealed": 730, "opened": 180}},
    "cream":         {"ambient": {"sealed": 730, "opened": 180}},
    "gel":           {"ambient": {"sealed": 730, "opened": 180}},
    "insulin":       {"refrigerated": {"sealed": 365, "opened": 28}},
    "injection vial":{"ambient": {"sealed": 730, "opened": 30}, "refrigerated": {"sealed": 730, "opened": 30}},
    "powder for suspension": {"ambient": {"sealed": 730, "opened": 10}},
    "ayurvedic syrup": {"ambient": {"sealed": 540, "opened": 45}},
}
MED_ALIASES = {
    "tab": "tablet",
    "cap": "capsule",
    "oral suspension": "suspension",
    "ear drops": "drops",
}
MED_DEFAULT_DAYS = {"ambient": 730, "refrigerated": 540, "frozen": 0}  # fallback if unknown

# ---- PRODUCTS (warranty months) ----
PRODUCT_WARRANTY_MONTHS = {
    "smartphone": 12,
    "mobile": 12,
    "laptop": 12,
    "desktop": 12,
    "monitor": 12,
    "tv": 12,
    "television": 12,
    "refrigerator": 12,
    "washing machine": 24,
    "ac": 12,
    "air conditioner": 12,
    "microwave": 12,
    "mixer": 12,
    "mixer grinder": 12,
    "headphones": 12,
    "earbuds": 12,
    "router": 12,
    "printer": 12,
    "camera": 12,
    "smartwatch": 12,
    "power bank": 6,
    "toaster": 12,
    "iron": 12,
    "geyser": 12,
}
PRODUCT_ALIASES = {
    "fridge": "refrigerator",
    "wm": "washing machine",
    "earphones": "earbuds",
}

PRODUCT_DEFAULT_WARRANTY_MONTHS = 12

# =========================
# Helpers
# =========================
def normalize(s: str) -> str:
    return (s or "").strip().lower()

def parse_date_or_today(s: str | None) -> datetime:
    if not s:
        return datetime.today()
    try:
        return datetime.strptime(s, "%Y-%m-%d")
    except Exception:
        return datetime.today()

def fuzzy_lookup(name: str, db_keys: list[str], aliases: dict[str, str]) -> str | None:
    n = normalize(name)
    if n in db_keys:
        return n
    if n in aliases:
        n2 = normalize(aliases[n])
        if n2 in db_keys:
            return n2
    # fuzzy
    matches = difflib.get_close_matches(n, db_keys, n=1, cutoff=0.8)
    return matches[0] if matches else None

def get_weather_factor(city: str, country: str, storage: str) -> tuple[float, dict]:
    """
    Weather factor only impacts ambient storage.
    """
    meta = {"temp": None, "humidity": None, "applied": False, "reason": ""}
    if storage != "ambient":
        meta["reason"] = "non_ambient_no_effect"
        return 1.0, meta
    if not OPENWEATHER_API_KEY:
        meta["reason"] = "no_api_key"
        return 1.0, meta
    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?q={city},{country}&appid={OPENWEATHER_API_KEY}&units=metric"
        resp = requests.get(url, timeout=5)
        data = resp.json()
        temp = data.get("main", {}).get("temp")
        hum = data.get("main", {}).get("humidity")
        meta["temp"] = temp
        meta["humidity"] = hum
        factor = 1.0
        if temp is None:
            meta["reason"] = "no_temp"
            return 1.0, meta
        # heat/humidity reduces shelf life
        if temp >= 35:
            factor *= 0.65
        elif temp >= 30:
            factor *= 0.75
        elif temp >= 25 and (hum is not None and hum >= 70):
            factor *= 0.85
        elif temp <= 10:
            factor *= 1.15
        meta["applied"] = True
        meta["reason"] = "ambient_weather_adjustment"
        dlog(f"Weather {city},{country} temp={temp}C humidity={hum}% -> factor={factor}")
        return factor, meta
    except Exception as e:
        dlog(f"Weather API error: {e}")
        meta["reason"] = "api_error"
        return 1.0, meta

def clamp_min_day(base: int, adjusted: int) -> int:
    if base > 0 and adjusted < 1:
        return 1
    return max(0, adjusted)

# =========================
# Core calculators
# =========================
def compute_food(product_name: str, purchase_date: datetime, city: str, country: str, storage: str, opened: str):
    storage = storage if storage in ("ambient", "refrigerated", "frozen") else DEFAULT_STORAGE_BY_CATEGORY["food"]
    opened = opened if opened in ("opened", "sealed") else DEFAULT_OPENED

    resolved = fuzzy_lookup(product_name, list(FOOD_DB.keys()), FOOD_ALIASES)
    resolved_display = resolved or product_name

    if resolved:
        days_base = FOOD_DB[resolved][storage].get(opened)
        if days_base is None:  # if missing opened/sealed detail
            days_base = next(iter(FOOD_DB[resolved][storage].values()))
        confidence = "high"
    else:
        # category fallbacks (very rough)
        key = f"food|{storage}"
        days_base = FOOD_CATEGORY_DEFAULTS.get(key, 30)
        confidence = "low"

    factor, meta = get_weather_factor(city, country, storage)
    days_adj = clamp_min_day(days_base, int(round(days_base * factor)))
    expiry = purchase_date + timedelta(days=days_adj)

    return {
        "category": "food",
        "product_name_input": product_name,
        "product_name_resolved": resolved_display,
        "purchase_date": purchase_date.strftime("%Y-%m-%d"),
        "storage": storage,
        "opened": opened,
        "city": city,
        "country": country,
        "base_days": days_base,
        "weather_factor": round(factor, 3),
        "weather_meta": meta,
        "adjusted_days": days_adj,
        "expiry_date": expiry.strftime("%Y-%m-%d"),
        "confidence": confidence,
        "model_type": "rule-based + weather adjustment",
    }

def compute_medicine(product_name: str, purchase_date: datetime, city: str, country: str, storage: str, opened: str):
    storage = storage if storage in ("ambient", "refrigerated", "frozen") else DEFAULT_STORAGE_BY_CATEGORY["medicine"]
    opened = opened if opened in ("opened", "sealed") else DEFAULT_OPENED

    resolved = fuzzy_lookup(product_name, list(MED_DB.keys()), MED_ALIASES)
    resolved_display = resolved or product_name

    if resolved and storage in MED_DB[resolved]:
        base_days = MED_DB[resolved][storage].get(opened) or next(iter(MED_DB[resolved][storage].values()))
        confidence = "high"
    elif resolved and "ambient" in MED_DB[resolved]:
        base_days = MED_DB[resolved]["ambient"].get(opened) or next(iter(MED_DB[resolved]["ambient"].values()))
        storage = "ambient"
        confidence = "medium"
    else:
        # Fallback: generic by storage (medicines usually have long shelf unless opened liquids)
        base_days = MED_DEFAULT_DAYS.get(storage, 540)
        confidence = "low"

    # Weather: minimal/no effect (packaged medicines); we do NOT apply temp factor by default.
    factor, meta = (1.0, {"applied": False, "reason": "no_weather_adjust_for_meds"})
    days_adj = clamp_min_day(base_days, int(round(base_days * factor)))
    expiry = purchase_date + timedelta(days=days_adj)

    return {
        "category": "medicine",
        "product_name_input": product_name,
        "product_name_resolved": resolved_display,
        "purchase_date": purchase_date.strftime("%Y-%m-%d"),
        "storage": storage,
        "opened": opened,
        "city": city,
        "country": country,
        "base_days": base_days,
        "adjusted_days": days_adj,
        "expiry_date": expiry.strftime("%Y-%m-%d"),
        "weather_factor": round(factor, 3),
        "weather_meta": meta,
        "confidence": confidence,
        "model_type": "rule-based (dosage-form defaults)",
    }

def add_months(dt: datetime, months: int) -> datetime:
    # simple add months without external libs
    year = dt.year + (dt.month - 1 + months) // 12
    month = (dt.month - 1 + months) % 12 + 1
    day = min(dt.day, [31,
        29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
        31,30,31,30,31,31,30,31,30,31][month-1])
    return dt.replace(year=year, month=month, day=day)

def compute_product(product_name: str, purchase_date: datetime):
    resolved = fuzzy_lookup(product_name, list(PRODUCT_WARRANTY_MONTHS.keys()), PRODUCT_ALIASES)
    resolved_display = resolved or product_name
    months = PRODUCT_WARRANTY_MONTHS.get(resolved, PRODUCT_DEFAULT_WARRANTY_MONTHS)
    end = add_months(purchase_date, months)
    return {
        "category": "product",
        "product_name_input": product_name,
        "product_name_resolved": resolved_display,
        "purchase_date": purchase_date.strftime("%Y-%m-%d"),
        "warranty_months": months,
        "warranty_end_date": end.strftime("%Y-%m-%d"),
        "model_type": "rule-based (typical warranties)",
        "confidence": "medium" if resolved else "low",
    }

# =========================
# CLI wrapper
# =========================
def usage_error():
    print(json.dumps({
        "error": "Usage: python PredictExpiry.py <product_name> <category: food|medicine|product> "
                 "[purchase_date YYYY-MM-DD] [city] [country] [storage] [opened]"
    }))
    sys.exit(1)

def main():
    if len(sys.argv) < 3:
        usage_error()

    product_name = sys.argv[1]
    category = normalize(sys.argv[2])

    purchase_date = parse_date_or_today(sys.argv[3] if len(sys.argv) >= 4 else None)
    city = sys.argv[4] if len(sys.argv) >= 5 else DEFAULT_CITY
    country = sys.argv[5] if len(sys.argv) >= 6 else DEFAULT_COUNTRY
    default_storage = DEFAULT_STORAGE_BY_CATEGORY.get(category, "ambient")
    storage = normalize(sys.argv[6]) if len(sys.argv) >= 7 else default_storage
    opened = normalize(sys.argv[7]) if len(sys.argv) >= 8 else DEFAULT_OPENED

    try:
        if category == "food":
            result = compute_food(product_name, purchase_date, city, country, storage, opened)
        elif category == "medicine":
            result = compute_medicine(product_name, purchase_date, city, country, storage, opened)
        elif category == "product":
            result = compute_product(product_name, purchase_date)
        else:
            result = {"error": f"Unknown category '{category}'. Use food|medicine|product."}
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        dlog(f"Unhandled error: {e}")
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()