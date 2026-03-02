# Relationable - 人物相関図エディタ

Relationableは、人物や事物の関係性を視覚的に整理・編集できる人物相関図作成ツールです。D3.jsを用いた直感的なグラフ操作と、IndexedDBによる自動保存機能を備えています。

## 主な機能

- **直感的な相関図作成**: D3.jsによる力学モデルを用いたノード（人物）とエッジ（関係）のレイアウト。
- **ドラッグ＆ドロップ**: ノードを自由に配置可能。
- **プロパティ編集**: 各人物の名前や画像を設定可能。
- **自動保存**: ブラウザのIndexedDBを使用して、作業内容をリアルタイムに保存。
- **エクスポート/インポート**: 作成したデータをJSON形式で保存・復元。
- **モダンなUI**: Material Web Components (MWC) を使用したクリーンなユーザーインターフェース。

## 技術スタック

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Visualization**: [D3.js (v7)](https://d3js.org/)
- **UI Components**: [Material Web Components (MWC)](https://github.com/material-components/material-web)
- **Database**: [IndexedDB](https://developer.mozilla.org/ja/docs/Web/API/IndexedDB_API) (ブラウザ内ストレージ)

## 実行方法

このプロジェクトは静的ファイルで構成されているため、ローカルサーバーを起動することで動作確認が可能です。

**Python を使用する場合:**
```bash
python3 -m http.server 8000
```
起動後、ブラウザで `http://localhost:8000` にアクセスしてください。

**VS Code Live Server を使用する場合:**
VS Code の拡張機能「Live Server」を使用すると、右下の「Go Live」ボタンをクリックするだけでプレビュー可能です。

## プロジェクト構造

```text
.
├── index.html          # メインのエントリポイント
├── css/
│   └── main.css        # スタイルシート
├── js/
│   ├── main.js         # アプリケーションの初期化
│   ├── graph.js        # D3.jsを用いたグラフ描画ロジック
│   ├── db.js           # IndexedDBへの保存・読み込み処理
│   └── ui.js           # UIイベントのハンドリング
├── lib/                # 外部ライブラリ（D3.js, MWC等）
└── package.json        # 依存関係定義
```

## ライセンス

ISC License
