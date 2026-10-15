# Dragon Ball Fusion Lab - Project Rules & Persistent Commands

## Power System v2 (supersedes old scaling at user request)
- Use src/power.ts as the only authority for calculations.
- PI is a game estimate, NOT canonical BP. PI = 100 + 10 * logPower.
- Distinguish exact character, story era and form. Never use legacy BP, level, rank or stars to decide a winner.
- Unknown profiles stay unknown; special erasure powers are not punching strength.
- Preserve old fields for backup compatibility only. Never overwrite original saved assets.
- Compare deterministically and offline. AI generates descriptions/images only.

## Fusion & Item Logic
- **Soul Fusion (Linh hồn - Hồi sinh):**
  - When a "Linh hồn" (Soul) fuses with a "Xác" (Corpse) or "Vô hồn" (Soulless) body, the result MUST be a "Hồi sinh" (Revived) or "Thức tỉnh" (Awakened) state.
  - **Visual Requirement:** The resulting image MUST show a vibrant, living character with glowing energy, bright eyes, and a powerful aura.
  - **Naming:** Must include "(Hồi sinh)" or "(Thức tỉnh)".
  - **Prompt Safety:** When generating the image prompt for a "Xác" or "Hồi sinh" character, NEVER use the words "Corpse", "Dead", or "Xác". Use "Soulless vessel" or "Awakened form" instead.
- **Deprivation (Tước đoạt/Hút hồn):**
  - Results in a "Xác" or "Vô hồn" state.
  - **Visual Requirement:** Pale skin, lifeless eyes, no aura.
  - **Power:** Drastic reduction (Rank F or E).

## Image Generation & Prompt Safety
- **Mandatory Visual Prompt:** Every fusion result MUST include a detailed `visual_prompt` in English for the image generation model.
- **Safety Filtering:** NEVER use words like "Corpse", "Dead", "Blood", "Gore", "Flesh", "Kill", "Death", "Dying" in the `visual_prompt`.
- **Euphemisms:**
  - Instead of "Corpse" or "Dead body", use "Soulless vessel", "Statue-like figure", "Pale-skinned avatar", "Empty shell".
  - Instead of "Dead eyes", use "Opaque eyes", "White eyes", "Expressionless gaze".
  - Instead of "Revived from death", use "Awakened from slumber", "Re-energized form", "Vibrant restoration".
- **Style Consistency:** 16-bit pixel art, Dragon Ball Z sprite style (Extreme Butoden aesthetic).
- **No Mechanical Parts:** Unless explicitly requested (e.g., Androids), avoid mechanical or cyborg details.
