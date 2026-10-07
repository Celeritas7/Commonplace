# Tolerance stack-up — practice set

Six problems for **DesignBench → 02 Tolerance Stack**. Each one is also built into the app (**Practice examples** list) and is in `stack-up-practice.json` (use **Import .json** to put all six into Saved chains).

How to use it: work the numbers by hand first (worst case and RSS are quick on a calculator), then load the example and check. Then do the "what if" questions by editing the chain. All answers are at the end. Monte Carlo figures use the app's default of 20 000 builds; they repeat exactly because the seed is fixed.

Reminders:
- Worst case (WC) = Σ tᵢ. RSS = 3·√(Σσᵢ²), with σ = t/3 for a Normal row at Cpk 1, so RSS = √(Σtᵢ²) when every row is Normal with Cpk 1.
- A row that opens the gap is **+**, one that closes it is **−**.
- An asymmetric tolerance (for example 15 0/−0.12) is entered as **mean ± half band**: 14.94 ± 0.06.

---

## P1 · Gearbox shaft end-float (warm-up)

| Dimension | Dir | Nominal | ± tol |
|---|---|---|---|
| Housing bore depth | + | 50 | 0.15 |
| Bearing width | − | 12 | 0.06 |
| Spacer | − | 25 | 0.10 |
| Gear hub | − | 12.5 | 0.08 |

Gap spec: 0.05 to 1.0 mm.

1. Nominal gap, WC range, RSS range. Does it pass worst case?
2. Which row contributes most to the variation, and roughly what share?
3. What if: the housing depth tolerance is tightened to ±0.05. New WC and RSS?

## P2 · Bearing pack axial play (circlip)

| Dimension | Dir | Nominal | ± tol | Drawing callout |
|---|---|---|---|---|
| Shoulder → groove wall | + | 22.30 | 0.05 | 22.30 ±0.05 |
| Bearing 6205 width | − | 14.94 | 0.06 | 15 0/−0.12 |
| Spacer ring | − | 6.00 | 0.05 | 6 ±0.05 |
| Circlip DIN 472 | − | 1.17 | 0.03 | 1.2 0/−0.06 |

Gap spec: 0.05 to 0.40 mm.

1. Check the two asymmetric conversions in the table yourself.
2. WC range and verdict. RSS range and estimated reject rate.
3. What if: you move the groove to 22.36 to centre the gap in the spec. Does that make it pass worst case? Why, or why not?

## P3 · Clevis and lug side clearance (ISO 2768)

The drawing has only a title-block general tolerance. Clevis slot 20 mm (ISO 2768-m), lug 19 mm (ISO 2768-f). Gap spec 0.3 to 1.8 mm.

1. Look up the two ISO 2768 values by hand, then pick them in the **Tol from** column and check.
2. WC range. Does it pass?
3. What if: the lug is also 2768-m. What changes?

## P4 · Ø25 H7 bore with an h6 shaft

Rows: bore Ø25 **H7** (+), shaft Ø25 **h6** (−). Gap spec: clearance ≥ 0.

1. IT7 and IT6 at Ø25 from the ISO 286 table. Write the limits of both parts.
2. Why is the "drawing nominal" gap 0.000 while the mean gap is 0.017?
3. Minimum and maximum clearance. Compare with the **Fits & Limits** tab, H7/h6 at Ø25.
4. What if: the bore becomes H8.

## P5 · Truck frame: hose to frame-flange clearance

A clamp bracket bolts to the frame web; the gap is from the hose outer surface to the inside of the lower frame flange. Rule: at least 5 mm.

| Dimension | Dir | Nominal | ± tol | Distribution |
|---|---|---|---|---|
| Flange → bracket bolt hole (frame) | + | 60 | 1.0 | Uniform |
| Bracket: hole → clamp seat | − | 35 | 0.5 | Normal |
| Clamp: seat → hose centre | − | 12 | 0.3 | Normal |
| Hose radius (Ø12 ±0.4) | − | 6 | 0.2 | Normal |

1. WC range and verdict.
2. The RSS normal estimate says about 0.055 % out of spec, yet worst case passes and Monte Carlo finds none. Explain the mismatch.
3. What if: the frame-hole row is Normal instead of Uniform. What happens to RSS?
4. What if: the frame-hole tolerance is really ±1.5 (still Uniform). Verdict and simulated reject rate?

## P6 · Six-part spindle stack with two weak suppliers

Six parts at ±0.05 each; housing 80.13 (+), parts A–E 20, 15, 20, 15, 10 (all −). Parts C and D come from a supplier at Cpk 0.5, the rest at Cpk 1.33. Gap spec 0 to 0.35 mm.

1. WC range and verdict.
2. Monte Carlo reject rate. Which rows dominate, and why, when every row has the same ±0.05?
3. What if: the weak supplier gets to Cpk 1.33 like the others.
4. What if: instead, you re-centre the nominal gap to 0.175 (housing 80.175) and keep the weak supplier.

---

## Answers

**P1.** Nominal 0.500. WC ±0.390 → 0.110 … 0.890: **passes**. RSS ±0.206 → 0.294 … 0.706. Housing depth gives 52.9 % of the variance. What if ±0.05: WC ±0.290, RSS ±0.150.

**P2.** 15 0/−0.12 → 14.94 ±0.06; 1.2 0/−0.06 → 1.17 ±0.03. Nominal 0.190. WC ±0.190 → 0.000 … 0.380: **fails** (below the 0.05 minimum). RSS ±0.098 → 0.093 … 0.287, estimated 8.2 ppm out; Monte Carlo finds none in 20 000. Verdict: fails worst case, statistically fine. What if 22.36: WC 0.060 … 0.440, **still fails**. The WC band is 0.38 wide and the spec window only 0.35, so no nominal can pass worst case; something has to be tightened (bearing width gives 37.9 % of the variance).

**P3.** 2768-m at 20 mm (6–30 range) = ±0.2; 2768-f at 19 mm = ±0.1. Nominal 1.000, WC ±0.300 → 0.700 … 1.300: **passes**. Lug at 2768-m: WC ±0.4 → 0.6 … 1.4, still passes.

**P4.** IT7 (18–30 mm) = 21 µm, IT6 = 13 µm. Bore 25.000 … 25.021, shaft 24.987 … 25.000. H and h bands are one-sided, so their centres sit +10.5 µm and −6.5 µm from 25.000: the drawing nominal gap is 0, the mean gap 0.017. Clearance 0.000 … 0.034, the same as the Fits & Limits tab. H8: IT8 = 33 µm, clearance 0.000 … 0.046, mean 0.023.

**P5.** Nominal 7.000, WC ±2.000 → 5.000 … 9.000: **passes**, exactly at the limit. A uniform part has σ = t/√3, so its "±3σ" is ±1.73·t, wider than the part can ever actually be. The RSS normal fit therefore puts tail beyond the true worst case, while Monte Carlo samples the real flat distribution and stays inside it. Treat the RSS number as conservative when uniform rows dominate (here the frame row is 88.8 %). As Normal: RSS ±1.175, estimate 0.2 ppm. At ±1.5 Uniform: WC 4.500 … 9.500, **fails**; Monte Carlo ≈ 0.015 % (about 3 in 20 000).

**P6.** Nominal 0.130, WC ±0.300 → −0.170 … 0.430: **fails**. Monte Carlo 0.825 % out (165 of 20 000); RSS ±0.160 estimates 0.747 %. Parts C and D each give 39 % of the variance: at Cpk 0.5, σ = 0.05/1.5 = 0.033, against 0.05/4 = 0.0125 for the Cpk 1.33 parts, so they carry about 7× the variance each. What if all at Cpk 1.33: RSS ±0.092, ≈ 11 ppm estimated, none simulated. What if re-centred to 0.175: ≈ 0.13 % simulated, better but still worse than fixing the supplier. Fix the process before redesigning the parts.
