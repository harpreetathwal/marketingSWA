## I use this script to generate thumbnail images alongside a folder of videos

```
# 1. Set your target directory and FFmpeg path
$VideoDir = "."
$FFmpegPath = "ffmpeg" # Or the full path to ffmpeg.exe

# 2. Grab all videos in the folder (change filter if needed)
Get-ChildItem -Path $VideoDir -Filter *.mp4 | ForEach-Object {
    
    # Define the output thumbnail name
    $ThumbName = $_.BaseName + "-thumbnail.webp"
    $ThumbPath = Join-Path -Path $VideoDir -ChildPath $ThumbName

    # 3. Build the FFmpeg command (-ss 00:00:03 extracts the frame at the 3-second mark)
    $arguments = "-ss 00:00:03 -i `"$($_.FullName)`" -vframes 1 -q:v 2 `"$ThumbPath`""

    # 4. Run the FFmpeg process
    Start-Process -FilePath $FFmpegPath -ArgumentList $arguments -NoNewWindow -Wait
}

```