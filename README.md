# レシピ集（閲覧専用ビューア）

静的サイト。ビルド不要。GitHub Pages にそのまま置けます。

```
index.html            画面の入れ物（触らない）
assets/style.css      見た目（触らない）
assets/app.js         表示ロジック（触らない）
recipes/index.json    表示するレシピのID一覧 ← 追加時にここへ1行
recipes/<id>.json     レシピ1件＝1ファイル ← ここだけ増やす／直す
```

## レシピを追加するとき（Claude Code の作業）

1. `recipes/<新しいid>.json` を作る（下のひな形どおり）
2. `recipes/index.json` の配列に `"<新しいid>"` を追加
3. `python3 -c "import json;[json.load(open(f'recipes/{i}.json')) for i in json.load(open('recipes/index.json'))]"` で構文確認
4. commit & push

**画面側のコード（index.html / assets/）は編集しないこと。**

## レシピを更新するとき

該当する `recipes/<id>.json` だけを書き換える。
`history` は追記のみ。過去の試作記録は消さない。
完成したら `status` を `"完全版"` に変えるだけでよい。

## データのひな形

```jsonc
{
  "id": "matcha-chiffon",          // ファイル名と同じ。半角英数とハイフン
  "name": "抹茶シフォン",
  "category": "シフォンケーキ",     // 新しい名前を書けばカテゴリは自動で増える
  "status": "完全版",              // 完全版／基本版／完成候補／改良中／試作中
  "summary": "一覧カードに出る一行説明",
  "tags": ["抹茶"],                // 検索用（任意）
  "variants": [                    // サイズ違いはここに並べる。1つでも可
    {
      "size": "17cm",
      "mold": "シフォン型 17cm",
      "status": "完全版",          // 省略時はレシピ全体の status を使う
      "ingredientGroups": [
        { "name": "卵黄生地", "items": [
          { "name": "卵黄", "amount": "3個", "note": "常温" }
        ]}
      ],
      "steps": ["手順1", "手順2"],
      "bakeTemp": "170℃",
      "bakeTime": "35分",
      "result": "仕上がりの状態",
      "points": ["重要ポイント"],
      "memo": "メモ（改行可）"
    }
  ],
  "history": [                     // 試作・改善の記録（任意・追記のみ）
    { "date": "2026/08/24", "change": "砂糖75g", "result": "甘すぎた", "next": "砂糖60gで試す" }
  ]
}
```

任意項目は書かなければ、その欄は画面に表示されません。

## 動作確認（ローカル）

`fetch` を使うため、ファイルを直接ダブルクリックでは開けません。

```
cd recipe-book && python3 -m http.server 8000
# → http://localhost:8000
```

## 保存されるもの

お気に入りと「最近見たレシピ」はブラウザ（localStorage）に保存。
端末ごとに独立し、レシピデータには影響しません。

## 後から追加する予定（今回は未実装）

写真登録／材料の倍率・サイズ自動換算／買い物リスト／印刷・PDF／★評価／作った日付／WEB上での追加・編集フォーム
