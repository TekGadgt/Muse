import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";
import { DEFAULT_BRANDS } from "eslint-plugin-obsidianmd/dist/lib/rules/ui/brands.js";

export default tseslint.config(
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["src/**/*.ts"],
    plugins: { obsidianmd },
    rules: {
      ...obsidianmd.configs.recommended,
      "obsidianmd/ui/sentence-case": [
        "error",
        {
          brands: [...DEFAULT_BRANDS, "OpenAI"],
        },
      ],
    },
  },
);
