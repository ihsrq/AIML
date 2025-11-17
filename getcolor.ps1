Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile("c:\Users\Imran\OneDrive\Desktop\syllabus a\Screenshot (46).png")
$color = $bmp.GetPixel(5,5)
"{0},{1},{2}" -f $color.R, $color.G, $color.B
$bmp.Dispose()
