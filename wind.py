import base64
import json
import os
import time
import io
import csv
from PIL import Image
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import ddddocr

# --- 1. 配置与初始化 ---
os.environ['ONNXRUNTIME_EXECUTION_MODE'] = 'SEQUENTIAL'

ocr = ddddocr.DdddOcr(show_ad=False)
MAPPING_FILE = "weather_mapping.json"
OUTPUT_CSV = "sz_wind_data_updated.csv"

# 数据校验阈值：54个站点，容许少量缺失，但不能过少
MIN_VALID_ROWS = 45

if os.path.exists(MAPPING_FILE) and os.path.getsize(MAPPING_FILE) > 0:
    try:
        with open(MAPPING_FILE, "r", encoding="utf-8") as f:
            value_mapping = json.load(f)
    except json.JSONDecodeError:
        print(f"警告: {MAPPING_FILE} 格式损坏，已重置。")
        value_mapping = {}
else:
    value_mapping = {}

# 54 个站点列表
BASE_STATIONS = [
    ["田头", 0, 0, 114.408, 22.689, "G3731", "石井"], ["梧桐村", 0, 0, 114.188, 22.594, "G1174", "东湖"],
    ["后瑞", 0, 0, 113.83, 22.631, "G3575", "航城"], ["松岗", 0, 0, 113.836, 22.778, "G3550", "松岗"],
    ["共和", 0, 0, 113.798, 22.755, "G3781", "沙井"], ["观象台", 0, 0, 113.932, 22.685, "59486", "石岩"],
    ["龙城", 0, 0, 114.242, 22.724, "G3570", "龙城"], ["平湖", 0, 0, 114.135, 22.676, "G3559", "平湖"],
    ["南山", 0, 0, 113.919, 22.519, "G3555", "南山"], ["和平", 0, 0, 113.788, 22.694, "G3746", "福海"],
    ["海山", 0, 0, 114.232, 22.557, "G3578", "海山"], ["南头", 0, 0, 113.914, 22.557, "G3546", "南头"],
    ["清水河", 0, 0, 114.101, 22.571, "G3527", "清水河"], ["圳美", 0, 0, 113.954, 22.798, "G3722", "新湖"],
    ["邮轮中心", 0, 0, 113.897, 22.476, "G3585", "招商"], ["公明", 0, 0, 113.891, 22.782, "G3529", "公明"],
    ["布吉", 0, 0, 114.124, 22.606, "G1166", "布吉"], ["南澳", 0, 0, 114.486, 22.534, "G3563", "南澳"],
    ["坪山", 0, 0, 114.34, 22.694, "G3538", "坪山"], ["岗厦", 0, 0, 114.046, 22.534, "G3773", "福保"],
    ["福城", 0, 0, 114.029, 22.733, "G3783", "福城"], ["阿婆髻", 0, 0, 113.882, 22.692, "G1132", "玉塘"],
    ["横岗", 0, 0, 114.193, 22.644, "G3560", "横岗"], ["大磡", 0, 0, 113.948, 22.61, "G3766", "西丽"],
    ["葵涌", 0, 0, 114.426, 22.635, "G1163", "葵涌"], ["西部通道", 0, 0, 113.939, 22.491, "G3641", "蛇口"],
    ["大鹏", 0, 0, 114.469, 22.6, "G1162", "大鹏"], ["塘家", 0, 0, 113.96, 22.721, "G3727", "凤凰"],
    ["观湖", 0, 0, 114.075, 22.7, "G3543", "观湖"], ["南园", 0, 0, 114.096, 22.537, "G3747", "南园"],
    ["光明", 0, 0, 113.944, 22.759, "G3528", "光明"], ["清林径", 0, 0, 114.238, 22.765, "G3564", "龙岗"],
    ["翠竹", 0, 0, 114.133, 22.558, "G3577", "翠竹"], ["莲塘", 0, 0, 114.171, 22.561, "G1173", "莲塘"],
    ["大康", 0, 0, 114.233, 22.646, "G3554", "园山"], ["大冲", 0, 0, 113.947, 22.551, "G3720", "粤海"],
    ["坑梓", 0, 0, 114.366, 22.746, "G3537", "坑梓"], ["燕山", 0, 0, 113.849, 22.82, "G3785", "燕罗"],
    ["铁岗水库", 0, 0, 113.884, 22.583, "G3692", "西乡"], ["大学城", 0, 0, 113.973, 22.596, "G3565", "桃源"],
    ["南湾", 0, 0, 114.158, 22.634, "G3558", "南湾"], ["大浪", 0, 0, 114.003, 22.683, "G3551", "大浪"],
    ["世界之窗", 0, 0, 113.969, 22.539, "G3561", "沙河"], ["基本站", 0, 0, 114.006, 22.541, "59493", "香蜜湖"],
    ["民治", 0, 0, 114.029, 22.622, "G3553", "民治"], ["细靓北", 0, 0, 114.08, 22.626, "G3739", "吉华"],
    ["小梅沙", 0, 0, 114.302, 22.602, "G1125", "梅沙"], ["坪地", 0, 0, 114.303, 22.777, "G3539", "坪地"],
    ["梅林水库", 0, 0, 114.047, 22.578, "G3562", "梅林"], ["江岭", 0, 0, 114.343, 22.651, "G3749", "马峦"],
    ["万丰", 0, 0, 113.82, 22.728, "G3557", "新桥"], ["明珠", 0, 0, 114.253, 22.594, "G3742", "盐田"],
    ["三棵松", 0, 0, 114.308, 22.712, "G3508", "宝龙"], ["沙湖", 0, 0, 114.3, 22.669, "G3753", "碧岭"]
]


def get_value_from_b64(b64_str):
    raw_b64 = b64_str.split(',')[-1]
    if raw_b64 in value_mapping:
        return value_mapping[raw_b64]

    img = Image.open(io.BytesIO(base64.b64decode(raw_b64)))
    background = Image.new("RGB", img.size, (255, 255, 255))
    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
    img = background.resize((img.width * 4, img.height * 4), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    res = ocr.classification(buf.getvalue())

    if res.isdigit() and len(res) >= 2:
        res = res[:-1] + "." + res[-1]

    value_mapping[raw_b64] = res
    return res


def build_driver():
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--disable-gpu')
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    driver.set_page_load_timeout(40)
    return driver


def try_scrape_once():
    """
    单次抓取尝试。成功返回 dict(街道 -> 风速)，
    失败（页面异常/数据不足）抛出异常，交由上层重试。
    """
    driver = build_driver()
    try:
        print("正在尝试访问页面...")
        try:
            driver.get("https://weather.sz.gov.cn/qixiangfuwu/qixiangjiance/zidongzhanchaxun/index.html")
        except Exception:
            print("页面加载超过 40 秒，强制停止并尝试解析现有 DOM...")
            driver.execute_script("window.stop();")

        wait = WebDriverWait(driver, 30)

        # 步骤 1: 切换到风速风向
        wind_main = wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(),'风速风向')]")))
        driver.execute_script("arguments[0].click();", wind_main)
        time.sleep(3)

        # 步骤 2: 切换到日最大瞬时
        sub_tab = wait.until(EC.presence_of_element_located((By.ID, "mdngv_Wind_DmaxS")))
        driver.execute_script("arguments[0].click();", sub_tab)

        # 关键改进：显式等待表格行出现，而不是死等固定时间
        print("正在等待表格渲染...")
        wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "#obtlist tr.obtitem")) > 0)
        time.sleep(5)  # 留一点余量，确保图片 src（验证码式数值图）渲染完毕

        rows = driver.find_elements(By.CSS_SELECTOR, "#obtlist tr.obtitem")
        print(f"找到 {len(rows)} 行数据，开始处理...")

        # 校验点 1：行数太少，说明页面没加载对
        if len(rows) < MIN_VALID_ROWS:
            raise RuntimeError(f"行数异常（{len(rows)} 行，期望至少 {MIN_VALID_ROWS} 行），判定为页面加载失败")

        data = {}
        for row in rows:
            try:
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", row)
                cells = row.find_elements(By.TAG_NAME, "td")
                if len(cells) >= 3:
                    name = cells[1].get_attribute('innerText').strip()
                    clean_name = name.replace("街道", "")

                    img_element = cells[2].find_element(By.TAG_NAME, "img")
                    src = img_element.get_attribute("src")
                    val_ms = get_value_from_b64(src)

                    try:
                        data[clean_name] = float(val_ms)
                    except:
                        data[clean_name] = 0.0
            except:
                continue

        # 校验点 2：有效匹配街道数太少，说明数据没解析全
        if len(data) < MIN_VALID_ROWS:
            raise RuntimeError(f"有效匹配街道数过少（{len(data)} 个，期望至少 {MIN_VALID_ROWS} 个），判定为解析失败")

        return data

    finally:
        driver.quit()


def try_scrape(max_retries=4, retry_wait=15):
    """
    带重试的抓取入口。每次失败都会重新开一个全新的 driver。
    多次失败后返回空 dict，由主流程决定是否跳过本次更新。
    """
    for attempt in range(1, max_retries + 1):
        print(f"===== 第 {attempt}/{max_retries} 次抓取尝试 =====")
        try:
            data = try_scrape_once()
            print(f"✅ 第 {attempt} 次尝试成功，获取到 {len(data)} 个街道数据")
            return data
        except Exception as e:
            print(f"❌ 第 {attempt} 次尝试失败: {e}")
            if attempt < max_retries:
                print(f"等待 {retry_wait} 秒后重试...")
                time.sleep(retry_wait)
            else:
                print("已达最大重试次数，放弃本轮抓取")

    return {}


def write_csv(realtime_data):
    print(f"抓取完成，成功匹配到 {len(realtime_data)} 个街道。正在写入 CSV...")
    with open(OUTPUT_CSV, mode='w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["自动站点", "日最大瞬时风力（m/s）", "kph", "经度", "纬度", "自动站号", "代表街道"])

        for station in BASE_STATIONS:
            site_name, ms, kph, lon, lat, sn, street = station
            current_ms = realtime_data.get(street, 0.0)
            current_kph = round(current_ms * 3.6, 1)
            writer.writerow([site_name, current_ms, current_kph, lon, lat, sn, street])

    with open(MAPPING_FILE, "w", encoding="utf-8") as f:
        json.dump(value_mapping, f, ensure_ascii=False, indent=4)


# --- 主流程 ---
if __name__ == "__main__":
    realtime_data = try_scrape(max_retries=4, retry_wait=15)

    if not realtime_data:
        print("⚠️ 多次尝试均失败，本次不更新 CSV，保留旧数据。")
        # 以非零状态码退出，方便 GitHub Actions 标记该次运行为失败，便于排查
        exit(1)
    else:
        write_csv(realtime_data)
        print("✨ 气象数据更新成功！")
