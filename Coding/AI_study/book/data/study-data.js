/* study-data.js — the study layer per chapter: printed asides, recall questions,
   an optional checked exercise and an optional interactive lab.

   Keyed by chapter id, then by SECTION INDEX (0-based, in notebook order — the
   reader numbers sections from the notebook's own H1/H2 headings).
   Anything missing simply doesn't render, so chapters you haven't written yet
   still read normally. */
window.AI_STUDY = {
  "04": {
    lab: { kind: "fit", title: "Least squares, by hand", section: 1 },   /* which section the lab plate sits in */
    sections: {
      0: {
        aside: "Keep the picture: points scattered around a flat sheet. Every model later in the book bends that sheet.",
        recall: { q: "With four input features, the surface a linear model fits is a…", options: ["line", "plane", "3-D hyperplane", "curve"], answer: 2,
          why: "One weight per feature → a flat object of dimension d−1 inside d-space. Flat, never curved." }
      },
      1: {
        aside: "Outliers hurt quadratically. One far point pulls the line more than ten near ones.",
        recall: { q: "Least squares chooses the line that minimises…", options: ["the sum of |residuals|", "the sum of squared residuals", "the largest residual", "how many points it misses"], answer: 1,
          why: "Squares make the loss smooth and differentiable — and give the closed-form solution sklearn uses." }
      },
      2: {
        aside: "Lasso uses ‖w‖₁ instead and zeroes weights outright — that's feature selection for free (ch. 10).",
        recall: { q: "As α → ∞, the Ridge slope…", options: ["grows without bound", "shrinks toward 0", "stays the OLS slope", "flips sign"], answer: 1,
          why: "The penalty dominates the fit; the cheapest w is 0, leaving only the intercept (the mean of y)." },
        exercise: { title: "Your turn",
          prompt: "Fit Ridge on the lab points with α = 5 and print the slope. The assert keeps you honest.",
          code: "import numpy as np\nfrom sklearn.linear_model import Ridge, LinearRegression\n\nX = np.array([p[0] for p in lab_points]).reshape(-1, 1)\ny = np.array([p[1] for p in lab_points])\n\nols = LinearRegression().fit(X, y)\nrid = Ridge(alpha=5).fit(X, y)\n\nprint(\"OLS slope  \", round(float(ols.coef_[0]), 4))\nprint(\"Ridge slope\", round(float(rid.coef_[0]), 4))\nassert abs(rid.coef_[0]) < abs(ols.coef_[0]), \"regularisation should shrink the slope\"\nprint(\"ok — the penalty shrank it\")" }
      }
    }
  }
};
