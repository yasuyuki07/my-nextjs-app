import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Next.js 推奨 + TypeScript ルールを読み込み
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // 無視パス
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },

  // === ここが追加ポイント（末尾なので上書きが効く） ===
  {
    rules: {
      // 本番までの暫定対応：any を許可（後で型付けするときに戻せます）
      "@typescript-eslint/no-explicit-any": "off",

      // 未使用変数は警告。引数・変数名が _ で始まるものは許容
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
