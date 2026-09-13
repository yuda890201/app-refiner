<#
.SYNOPSIS
    App Refiner のローカル環境セットアップと公開状態の確認を一括で行います。

.DESCRIPTION
    次の処理をまとめて実行します。
      1. 前提ツール（git / gh / node）の確認
      2. リポジトリのクローンまたは最新化
      3. GitHub Pages の設定状態の確認（gh が使える場合）
      4. 公開URLが配信している index.html とローカルの内容を比較
      5. スモークテストの実行（-RunTests を付けた場合）
      6. ブラウザで公開URLを開く（-OpenSite を付けた場合）

.EXAMPLE
    .\Invoke-AppRefinerCheck.ps1
    既定の場所にクローン／最新化して、公開状態を確認します。

.EXAMPLE
    .\Invoke-AppRefinerCheck.ps1 -RunTests -OpenSite
    スモークテストも実行し、最後にブラウザで公開URLを開きます。

.NOTES
    Windows PowerShell 5.1 / PowerShell 7 のどちらでも動作します。
    このスクリプトはリポジトリへの書き込みや公開操作を一切行いません（読み取りと確認のみ）。
#>
[CmdletBinding()]
param(
    [string] $WorkDir  = (Join-Path $HOME 'ai-dev\projects'),
    [string] $Repo     = 'yuda890201/app-refiner',
    [string] $SiteUrl  = 'https://yuda890201.github.io/app-refiner/',
    [string] $Branch   = 'main',
    [int]    $Port     = 8899,
    [switch] $RunTests,
    [switch] $OpenSite,
    [switch] $SkipClone
)

$ErrorActionPreference = 'Stop'
$script:Results = New-Object System.Collections.Generic.List[object]

function Write-Step {
    param([string] $Text)
    Write-Host ''
    Write-Host ('=== ' + $Text + ' ===') -ForegroundColor Cyan
}

function Add-Result {
    param(
        [string] $Name,
        [ValidateSet('OK', 'NG', 'SKIP', 'WARN')] [string] $Status,
        [string] $Detail = ''
    )
    $script:Results.Add([pscustomobject]@{ 項目 = $Name; 結果 = $Status; 内容 = $Detail })
    $color = switch ($Status) {
        'OK'   { 'Green' }
        'NG'   { 'Red' }
        'WARN' { 'Yellow' }
        default { 'DarkGray' }
    }
    Write-Host ('  [' + $Status + '] ' + $Name + ' ' + $Detail) -ForegroundColor $color
}

function Test-Command {
    param([string] $Name)
    $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

# Windows では npx / npm は npx.cmd として解決される。Start-Process に渡せる実体名を返す
function Resolve-NodeTool {
    param([string] $Name)
    foreach ($candidate in @(($Name + '.cmd'), $Name)) {
        $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd.Source }
    }
    return $Name
}

# 改行コードの違いを無視して比較するための正規化
function Get-NormalizedHash {
    param([string] $Text)
    $normalized = $Text -replace "`r`n", "`n"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($normalized)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        return ([System.BitConverter]::ToString($sha.ComputeHash($bytes)) -replace '-', '').ToLower()
    } finally {
        $sha.Dispose()
    }
}

Write-Host ''
Write-Host 'App Refiner 環境チェック' -ForegroundColor White
Write-Host ('リポジトリ : ' + $Repo)
Write-Host ('公開URL    : ' + $SiteUrl)

# ---------------------------------------------------------------
Write-Step '1. 前提ツールの確認'
# ---------------------------------------------------------------
$hasGit  = Test-Command 'git'
$hasGh   = Test-Command 'gh'
$hasNode = Test-Command 'node'

if ($hasGit) {
    Add-Result 'git' 'OK' ((git --version) -join '')
} else {
    Add-Result 'git' 'NG' 'git が見つかりません。https://git-scm.com/ から導入してください。'
}
if ($hasGh) {
    Add-Result 'gh' 'OK' ((gh --version | Select-Object -First 1) -join '')
} else {
    Add-Result 'gh' 'SKIP' 'GitHub CLI 未導入のため Pages の設定確認は省略します。'
}
if ($hasNode) {
    Add-Result 'node' 'OK' ((node --version) -join '')
} else {
    Add-Result 'node' 'SKIP' 'Node.js 未導入のためテスト実行は省略します。'
}

if (-not $hasGit) {
    Write-Host ''
    Write-Host 'git が必須のため中断します。' -ForegroundColor Red
    return
}

# ---------------------------------------------------------------
Write-Step '2. リポジトリの取得 / 最新化'
# ---------------------------------------------------------------
$repoName = $Repo.Split('/')[-1]
$repoPath = Join-Path $WorkDir $repoName

if ($SkipClone) {
    Add-Result 'クローン' 'SKIP' '-SkipClone が指定されました。'
} elseif (Test-Path (Join-Path $repoPath '.git')) {
    Push-Location $repoPath
    try {
        git fetch origin $Branch --quiet
        $status = (git status --porcelain --untracked-files=no)
        if ($status) {
            Add-Result 'ローカル変更' 'WARN' '未コミットの変更があるため pull を見送りました。'
        } else {
            git checkout $Branch --quiet
            git pull --ff-only origin $Branch --quiet
            Add-Result '最新化' 'OK' ($repoPath + ' を ' + $Branch + ' の最新にしました。')
        }
        $head = (git rev-parse --short HEAD)
        $subject = (git log -1 --pretty=%s)
        Add-Result '現在のコミット' 'OK' ($head + ' ' + $subject)
    } finally {
        Pop-Location
    }
} else {
    if (-not (Test-Path $WorkDir)) { New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null }
    git clone ('https://github.com/' + $Repo + '.git') $repoPath --quiet
    Add-Result 'クローン' 'OK' ($repoPath + ' に取得しました。')
}

$localIndex = Join-Path $repoPath 'index.html'
if (Test-Path $localIndex) {
    $size = (Get-Item $localIndex).Length
    Add-Result 'ローカル index.html' 'OK' ([string]$size + ' バイト')
} else {
    Add-Result 'ローカル index.html' 'NG' '見つかりません。'
}

# ---------------------------------------------------------------
Write-Step '3. GitHub Pages の設定'
# ---------------------------------------------------------------
if ($hasGh) {
    try {
        $pagesJson = gh api ('repos/' + $Repo + '/pages') 2>$null
        if ($LASTEXITCODE -eq 0 -and $pagesJson) {
            $pages = $pagesJson | ConvertFrom-Json
            $src = ''
            if ($pages.source) { $src = $pages.source.branch + ' (' + $pages.source.path + ')' }
            Add-Result 'Pages 状態' 'OK' ('status=' + $pages.status + ' / build_type=' + $pages.build_type)
            Add-Result 'Pages 配信元' 'OK' $src
            Add-Result 'Pages URL' 'OK' $pages.html_url
        } else {
            Add-Result 'Pages 状態' 'WARN' 'gh api が失敗しました（未認証の可能性）。gh auth login を試してください。'
        }
    } catch {
        Add-Result 'Pages 状態' 'WARN' ('取得に失敗: ' + $_.Exception.Message)
    }
} else {
    Add-Result 'Pages 状態' 'SKIP' 'gh が無いため省略。'
}

# ---------------------------------------------------------------
Write-Step '4. 公開中の index.html とローカルの比較'
# ---------------------------------------------------------------
try {
    $bust = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $url = $SiteUrl.TrimEnd('/') + '/index.html?cb=' + $bust
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
    $remoteText = $resp.Content
    Add-Result '公開URLの応答' 'OK' ('HTTP ' + [int]$resp.StatusCode + ' / ' + $remoteText.Length + ' 文字')

    if (Test-Path $localIndex) {
        $localText = Get-Content -Path $localIndex -Raw -Encoding UTF8
        $localHash  = Get-NormalizedHash $localText
        $remoteHash = Get-NormalizedHash $remoteText
        if ($localHash -eq $remoteHash) {
            Add-Result '内容の一致' 'OK' '公開中の内容はローカルと一致しています。'
        } else {
            Add-Result '内容の一致' 'WARN' 'まだ一致していません。Pages の反映待ち（数分）か、未 push の変更があります。'
        }
    }

    # 司令塔アプリとして機能する版かどうかの簡易判定
    $markers = @('data-app-card', 'buildInstruction', '改修指示書')
    $missing = @()
    foreach ($m in $markers) { if ($remoteText -notmatch [regex]::Escape($m)) { $missing += $m } }
    if ($missing.Count -eq 0) {
        Add-Result '司令塔アプリ版を配信中' 'OK' '主要な機能の痕跡をすべて確認しました。'
    } else {
        Add-Result '司令塔アプリ版を配信中' 'WARN' ('見つからない要素: ' + ($missing -join ', '))
    }
} catch {
    Add-Result '公開URLの応答' 'NG' ('取得に失敗: ' + $_.Exception.Message)
}

# ---------------------------------------------------------------
Write-Step '5. スモークテスト'
# ---------------------------------------------------------------
if (-not $RunTests) {
    Add-Result 'スモークテスト' 'SKIP' '-RunTests を付けると実行します。'
} elseif (-not $hasNode) {
    Add-Result 'スモークテスト' 'SKIP' 'Node.js が必要です。'
} else {
    Push-Location $repoPath
    $server = $null
    try {
        $hasPlaywright = $false
        try {
            node -e "require.resolve('playwright')" 2>$null | Out-Null
            $hasPlaywright = ($LASTEXITCODE -eq 0)
        } catch { $hasPlaywright = $false }

        if (-not $hasPlaywright) {
            Write-Host '  playwright を導入します（初回のみ数分かかります）...' -ForegroundColor DarkGray
            npm install --no-save playwright | Out-Null
            npx playwright install chromium | Out-Null
        }

        Write-Host ('  http-server をポート ' + $Port + ' で起動します...') -ForegroundColor DarkGray
        $npx = Resolve-NodeTool 'npx'
        $startArgs = @{
            FilePath     = $npx
            ArgumentList = @('--yes', 'http-server', '.', '-p', [string]$Port, '--silent')
            PassThru     = $true
        }
        # -WindowStyle は Windows 版でのみ有効（PS 5.1 は常に Windows）
        if ($PSVersionTable.PSVersion.Major -le 5 -or $IsWindows) { $startArgs.WindowStyle = 'Hidden' }
        $server = Start-Process @startArgs
        Start-Sleep -Seconds 4

        $env:SHOT = Join-Path $repoPath 'smoke-shot.png'
        $env:PORT = [string]$Port   # tests/smoke.mjs に同じポートを使わせる
        $output = & node 'tests/smoke.mjs' 2>&1
        $exit = $LASTEXITCODE
        $passCount = ([regex]::Matches(($output -join "`n"), '(?m)^PASS')).Count
        $failCount = ([regex]::Matches(($output -join "`n"), '(?m)^FAIL')).Count

        if ($failCount -eq 0 -and $passCount -gt 0) {
            Add-Result 'スモークテスト' 'OK' ([string]$passCount + ' 項目すべて成功')
        } else {
            Add-Result 'スモークテスト' 'NG' ('成功 ' + $passCount + ' / 失敗 ' + $failCount)
            $output | Where-Object { $_ -match '^FAIL' } | ForEach-Object {
                Write-Host ('      ' + $_) -ForegroundColor Red
            }
        }
    } catch {
        Add-Result 'スモークテスト' 'NG' ('実行に失敗: ' + $_.Exception.Message)
    } finally {
        if ($server -and -not $server.HasExited) {
            Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
        }
        Pop-Location
    }
}

# ---------------------------------------------------------------
Write-Step '6. 結果'
# ---------------------------------------------------------------
# ホストの幅に左右されないよう、明示的に整形して出力する
$table = $script:Results | Format-Table -AutoSize | Out-String -Width 200
Write-Host $table

$ng   = @($script:Results | Where-Object { $_.結果 -eq 'NG' })
$warn = @($script:Results | Where-Object { $_.結果 -eq 'WARN' })

if ($ng.Count -gt 0) {
    Write-Host ('問題が ' + $ng.Count + ' 件あります。上の [NG] を確認してください。') -ForegroundColor Red
} elseif ($warn.Count -gt 0) {
    Write-Host ('注意が ' + $warn.Count + ' 件あります。多くは Pages の反映待ちです。数分後に再実行してください。') -ForegroundColor Yellow
} else {
    Write-Host 'すべて正常です。' -ForegroundColor Green
}

Write-Host ''
Write-Host ('作業ディレクトリ: ' + $repoPath)

if ($OpenSite) {
    Write-Host ('ブラウザで ' + $SiteUrl + ' を開きます...') -ForegroundColor DarkGray
    Start-Process $SiteUrl
}
