# VOICEVOX 音声生成スクリプト (ずんだもん あまあま)
# 使い方:
#   1. VOICEVOX を起動 (https://voicevox.hiroshiba.jp/)
#   2. PowerShell で `.\voice-gen.ps1` を実行
#   3. audio/ フォルダにWAVファイルが大量に生成される
# クレジット: VOICEVOX:ずんだもん

$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:50021'
$speaker = 3   # 3 = ずんだもん あまあま
$speedScale = 0.95
$pitchScale = 0.0
$intonationScale = 1.2

$root = $PSScriptRoot
if ([string]::IsNullOrEmpty($root)) { $root = (Get-Location).Path }
$outdir = Join-Path $root 'audio'
New-Item -ItemType Directory -Force -Path $outdir | Out-Null

# 接続確認
Write-Host "VOICEVOX エンジンに接続中..." -ForegroundColor Cyan
try {
  $resp = Invoke-WebRequest -Uri "$base/speakers" -UseBasicParsing -TimeoutSec 5
  if ($resp.StatusCode -ne 200) { throw "status $($resp.StatusCode)" }
  Write-Host "OK 接続できました" -ForegroundColor Green
} catch {
  Write-Host "VOICEVOX に接続できません。先に VOICEVOX を起動してください。" -ForegroundColor Red
  Write-Host "  ダウンロード: https://voicevox.hiroshiba.jp/" -ForegroundColor Yellow
  exit 1
}

function Hex([char]$ch) {
  return ([int]$ch).ToString('x')
}

function Gen([string]$name, [string]$text) {
  $outpath = Join-Path $outdir "$name.wav"
  if (Test-Path $outpath) {
    Write-Host "  skip  $name.wav" -ForegroundColor DarkGray
    return
  }
  $encoded = [uri]::EscapeDataString($text)
  try {
    $query = Invoke-RestMethod -Method POST -Uri "$base/audio_query?text=$encoded&speaker=$speaker"
    $query.speedScale = $speedScale
    $query.pitchScale = $pitchScale
    $query.intonationScale = $intonationScale
    $json = $query | ConvertTo-Json -Depth 20 -Compress
    Invoke-WebRequest -Method POST -Uri "$base/synthesis?speaker=$speaker" -Body $json -ContentType 'application/json' -OutFile $outpath -UseBasicParsing | Out-Null
    Write-Host "  ok    $name.wav  ($text)" -ForegroundColor Green
  } catch {
    Write-Host "  FAIL  $name.wav  $_" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "=== ひらがな ===" -ForegroundColor Cyan
$hira = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'
foreach ($ch in $hira.ToCharArray()) { Gen "c_$(Hex $ch)" "$ch" }

Write-Host ""
Write-Host "=== カタカナ ===" -ForegroundColor Cyan
$kata = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
foreach ($ch in $kata.ToCharArray()) { Gen "c_$(Hex $ch)" "$ch" }

Write-Host ""
Write-Host "=== 動物の なまえ ===" -ForegroundColor Cyan
$animals = [ordered]@{
  rabbit  = 'さくらクォーツうさぎ'
  cat     = 'アクアマリンねこ'
  chick   = 'レモンクリスタルひよこ'
  bear    = 'ラベンダーアメジストこぐま'
  fox     = 'ミントジェイドきつね'
  fawn    = 'ピーチオパールこじか'
  penguin = 'ムーンストーンペンギン'
  hamster = 'キャンディトルマリンハムスター'
  seal    = 'パールあざらし'
  panda   = 'ベビーダイヤパンダ'
}
foreach ($k in $animals.Keys) { Gen "a_$k" $animals[$k] }

Write-Host ""
Write-Host "=== ことば クイズ単語 ===" -ForegroundColor Cyan
$words = [ordered]@{
  'あ' = 'あり'; 'い' = 'いぬ'; 'う' = 'うさぎ'; 'え' = 'えび'; 'お' = 'おにぎり'
  'か' = 'かに'; 'き' = 'きりん'; 'く' = 'くま'; 'け' = 'けーき'; 'こ' = 'こあら'
  'さ' = 'さかな'; 'し' = 'しか'; 'す' = 'すいか'; 'せ' = 'せみ'; 'そ' = 'そら'
  'た' = 'たこ'; 'ち' = 'ちょう'; 'つ' = 'つき'; 'て' = 'て'; 'と' = 'とら'
  'な' = 'なす'; 'に' = 'にじ'; 'ぬ' = 'ぬいぐるみ'; 'ね' = 'ねこ'; 'の' = 'のーと'
  'は' = 'はな'; 'ひ' = 'ひまわり'; 'ふ' = 'ふうせん'; 'へ' = 'へび'; 'ほ' = 'ほし'
  'ま' = 'まど'; 'み' = 'みかん'; 'む' = 'むし'; 'め' = 'めがね'; 'も' = 'もも'
  'や' = 'やま'; 'ゆ' = 'ゆき'; 'よ' = 'よっと'
  'ら' = 'らいおん'; 'り' = 'りんご'; 'る' = 'るすばん'; 'れ' = 'れもん'; 'ろ' = 'ろぼっと'
  'わ' = 'わに'
  'ア' = 'アイス'; 'イ' = 'イルカ'; 'ウ' = 'ウサギ'; 'エ' = 'エビ'; 'オ' = 'オニ'
  'カ' = 'カメラ'; 'キ' = 'キリン'; 'ク' = 'クマ'; 'ケ' = 'ケーキ'; 'コ' = 'コップ'
  'サ' = 'サル'; 'シ' = 'シカ'; 'ス' = 'スイカ'; 'セ' = 'セミ'; 'ソ' = 'ソーダ'
  'タ' = 'タコ'; 'チ' = 'チーズ'; 'ツ' = 'ツキ'; 'テ' = 'テント'; 'ト' = 'トマト'
  'ナ' = 'ナス'; 'ニ' = 'ニンジン'; 'ヌ' = 'ヌードル'; 'ネ' = 'ネコ'; 'ノ' = 'ノート'
  'ハ' = 'ハート'; 'ヒ' = 'ヒマワリ'; 'フ' = 'フォーク'; 'ヘ' = 'ヘビ'; 'ホ' = 'ホシ'
  'マ' = 'マイク'; 'ミ' = 'ミルク'; 'ム' = 'ムシ'; 'メ' = 'メガネ'; 'モ' = 'モモ'
  'ヤ' = 'ヤマ'; 'ユ' = 'ユキ'; 'ヨ' = 'ヨット'
  'ラ' = 'ライオン'; 'リ' = 'リンゴ'; 'ル' = 'ルビー'; 'レ' = 'レモン'; 'ロ' = 'ロケット'
  'ワ' = 'ワニ'
}
foreach ($k in $words.Keys) {
  $ch = [char]$k
  Gen "w_$(Hex $ch)" $words[$k]
}

Write-Host ""
Write-Host "=== フレーズ ===" -ForegroundColor Cyan
$phrases = [ordered]@{
  correct  = 'せいかい'
  again    = 'もういちど'
  done     = 'できた'
  treasure = 'あたらしい たからもの'
}
foreach ($k in $phrases.Keys) { Gen "p_$k" $phrases[$k] }

Write-Host ""
Write-Host "ぜんぶ できたよ！ audio フォルダを GitHub にアップロードしてね。" -ForegroundColor Cyan
Write-Host "クレジット表記: VOICEVOX:ずんだもん" -ForegroundColor Yellow
