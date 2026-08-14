from PIL import Image
import os

def make_transparent(input_path, output_path, bg_color='white', tolerance=50):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()
    newData = []
    
    if bg_color == 'white':
        for item in datas:
            if item[0] > 255 - tolerance and item[1] > 255 - tolerance and item[2] > 255 - tolerance:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
    elif bg_color == 'black':
        for item in datas:
            if item[0] < tolerance and item[1] < tolerance and item[2] < tolerance:
                newData.append((0, 0, 0, 0))
            else:
                newData.append(item)
                
    img.putdata(newData)
    img.save(output_path, "PNG")

print("Processing images...")
make_transparent('assets/images/surfer_element.jpg', 'assets/images/surfer_element.png', 'white', 60)
make_transparent('assets/images/boat_element.jpg', 'assets/images/boat_element.png', 'white', 60)
make_transparent('assets/images/cloud_element.jpg', 'assets/images/cloud_element.png', 'black', 60)
print("Done!")
