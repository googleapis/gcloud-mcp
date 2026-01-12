from google import genai
# خیال رہے کہ تصویر بنانے کے لیے آپ کو ایک الگ API یا سروس کی ضرورت ہوگی،
# یہاں میں نے صرف ایک پلیس ہولڈر فنکشن شامل کیا ہے تاکہ آپ کو سمجھا سکوں۔

# AIzaSyBSEBITd9gU4ZAItYc_kcJxUEohwfv3V-Y
client = genai.Client(api_key="آپ_کی_اے_پی_آئی_کی")

def generate_sdn_news(raw_info):
    # مرحلہ 1: خبر کا متن تیار کرنا
    news_prompt = f"""
    آپ SDN News کے ایک سینئر ایڈیٹر ہیں۔ درج ذیل معلومات سے ایک پیشہ ورانہ اردو خبر تیار کریں:
    معلومات: {raw_info}
    
    ہدایات:
    1. ایک جاندار سرخی بنائیں۔
    2. متن کو پیراگراف میں لکھیں۔
    3. آخر میں SDN News کا مخصوص فوٹر شامل کریں۔
    """
    
    news_response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=news_prompt
    )
    
    generated_news_text = news_response.text
    
    # خبر کی پہلی سطر کو سرخی کے طور پر استعمال کریں
    headline = generated_news_text.split('\n')[0] 
    
    # مرحلہ 2: تصویر تیار کرنا (فرض کریں کہ آپ کے پاس ایک تصویر جنریشن سروس ہے)
    image_description_prompt = f"خبر کے عنوان کے مطابق ایک تصویر کی وضاحت کریں: {headline}"
    
    # یہاں ہم فرض کر رہے ہیں کہ ہم ایک تصویر بنائیں گے
    # اصل عمل میں، آپ یہاں ایک علیحدہ تصویر بنانے والے API کو کال کریں گے
    # مثال کے طور پر: image_api.create_image(image_description_prompt)
    
    # اس مثال کے لیے، ہم صرف یہ ظاہر کر رہے ہیں کہ تصویر تیار ہو گئی ہے۔
    image_generated_message = f"\n\n---تصویر---\nخبر کی سرخی '{headline}' سے متعلقہ ایک خوبصورت اور واضح تصویر تیار کی گئی ہے۔\n"
    
    return generated_news_text + image_generated_message

# ٹیسٹ کے لیے خبر کی کچی معلومات
news_input = "آج سرائے عالمگیر میں بہت خوبصورت بارش ہوئی جس سے ہر طرف ہریالی اور تازگی چھا گئی۔ کسانوں کے چہروں پر بھی خوشی نمایاں تھی۔"
print(generate_sdn_news(news_input))
