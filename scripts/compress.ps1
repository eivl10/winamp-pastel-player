$audioDir = "f:\Vibecoding\# Проекты\Winamp\assets\audio"
$videoDir = "f:\Vibecoding\# Проекты\Winamp\assets\videos"

# Audio compress
Write-Host "Compressing MP3s..."
$mp3Files = Get-ChildItem -Path $audioDir -Filter *.mp3
foreach ($file in $mp3Files) {
    if ($file.Name -match "_compressed") { continue }
    $tempName = "$audioDir\$($file.BaseName)_compressed.mp3"
    Write-Host "Compressing $($file.Name) to 256k..."
    ffmpeg -y -i $file.FullName -b:a 256k $tempName -loglevel warning
    if (Test-Path $tempName) {
        Remove-Item $file.FullName
        Rename-Item $tempName $file.Name
    }
}

# Video compress
Write-Host "Compressing Video..."
$movFile = "$videoDir\большое.MOV"
$mp4File = "$videoDir\bolshoe.mp4"
if (Test-Path $movFile) {
    Write-Host "Compressing большое.MOV..."
    ffmpeg -y -i $movFile -vcodec libx264 -crf 28 -preset fast -acodec aac -b:a 128k $mp4File -loglevel warning
    if (Test-Path $mp4File) {
        Remove-Item $movFile
    }
}

Write-Host "Done."
