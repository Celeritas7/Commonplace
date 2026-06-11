/* Classical Machine Learning — chapter metadata
   Each chapter drives a contents card and a per-chapter cover page.
   `motif` selects a 4D-projection plate; `seed` keeps each plate distinct. */
window.AI_CHAPTERS = [
  {
    id: "01", file: "01_Introduction_to_NumPy.ipynb",
    title: "Introduction to NumPy", group: "Foundations",
    tag: "Arrays & vectorization", time: 40, motif: "lattice", seed: 7,
    lead: "The numerical substrate of everything that follows. NumPy turns Python lists into fast, n-dimensional arrays — the data structure every model in this book is secretly built on.",
    learn: [
      "Create and reshape ndarrays, and reason about axes",
      "Vectorize loops away with broadcasting",
      "Slice, mask and index without copying data",
      "Reduce along axes — sum, mean, argmax"
    ],
    concepts: ["ndarray", "broadcasting", "axis", "dtype", "vectorization"]
  },
  {
    id: "01b", file: "01b_NumPy_Reference.ipynb",
    title: "NumPy Reference", group: "Foundations",
    tag: "Quick reference", time: 15, motif: "lattice", seed: 19, kind: "reference",
    lead: "A companion lookup sheet — the operations you reach for once you know what you need but forget the exact call.",
    learn: [
      "Array creation routines at a glance",
      "Shape manipulation: reshape, stack, concatenate",
      "Linear-algebra and random helpers",
      "Common gotchas with views vs copies"
    ],
    concepts: ["reference", "linalg", "random", "stack", "where"]
  },
  {
    id: "02", file: "02_Pandas_for_ML.ipynb",
    title: "Pandas for ML", group: "Foundations",
    tag: "DataFrames & data prep", time: 45, motif: "scatter", seed: 3,
    lead: "Real datasets arrive messy. Pandas is where you load, clean, join and shape tabular data into the matrix a model can actually consume.",
    learn: [
      "Load CSVs and inspect with head / info / describe",
      "Select and filter rows and columns cleanly",
      "Handle missing values and types",
      "Group, aggregate and pivot for features"
    ],
    concepts: ["DataFrame", "Series", "groupby", "merge", "missing data"]
  },
  {
    id: "03", file: "03_Plotting.ipynb",
    title: "Plotting", group: "Foundations",
    tag: "Matplotlib visualization", time: 35, motif: "axes", seed: 11,
    lead: "You can't fix what you can't see. Matplotlib is the lens you use to look at distributions, relationships and — later — your model's mistakes.",
    learn: [
      "Build line, scatter and histogram plots",
      "Control figures, axes and styling",
      "Read distributions and correlations visually",
      "Annotate plots so a chart explains itself"
    ],
    concepts: ["figure", "axes", "scatter", "histogram", "subplots"]
  },
  {
    id: "04", file: "04_Linear_Models.ipynb",
    title: "Linear Models", group: "Core models & workflow",
    tag: "Regression & classification", time: 50, motif: "hyperplane", seed: 5,
    lead: "The first real models — and the workhorses of the field. A straight line (in many dimensions) is often all you need, and always the baseline to beat.",
    learn: [
      "Fit LinearRegression and read its coefficients",
      "Classify with LogisticRegression",
      "Tame overfitting with Ridge and Lasso",
      "Understand the loss each one minimizes"
    ],
    concepts: ["LinearRegression", "LogisticRegression", "Ridge", "Lasso", "regularization"]
  },
  {
    id: "05", file: "05_Preprocessing.ipynb",
    title: "Preprocessing", group: "Core models & workflow",
    tag: "Scaling, encoding, imputation", time: 45, motif: "lattice", seed: 23,
    lead: "Models don't see raw data — they see whatever you transform it into. Preprocessing is the quiet step that decides whether anything downstream works.",
    learn: [
      "Scale features with StandardScaler / MinMaxScaler",
      "Encode categories with OneHotEncoder",
      "Fill gaps with SimpleImputer",
      "Avoid leaking test data into the fit"
    ],
    concepts: ["StandardScaler", "OneHotEncoder", "SimpleImputer", "fit/transform", "leakage"]
  },
  {
    id: "06", file: "06_Decision_Trees.ipynb",
    title: "Decision Trees", group: "Core models & workflow",
    tag: "Tree-based models", time: 40, motif: "tree", seed: 2,
    lead: "A model you can read like a flowchart. Trees split the feature space into rectangles — intuitive, nonlinear, and the building block of the most powerful classical models.",
    learn: [
      "Grow a DecisionTreeClassifier / Regressor",
      "Read splits, gini and entropy",
      "Control depth to fight overfitting",
      "Visualise and interpret the tree"
    ],
    concepts: ["DecisionTree", "gini", "entropy", "max_depth", "feature_importance"]
  },
  {
    id: "07", file: "07_Naive_Bayes.ipynb",
    title: "Naive Bayes", group: "Core models & workflow",
    tag: "Probabilistic classifiers", time: 30, motif: "scatter", seed: 31,
    lead: "Surprisingly strong, gloriously simple. Naive Bayes applies Bayes' theorem with a bold independence assumption — and still wins at text and high-dimensional problems.",
    learn: [
      "The probability story behind the classifier",
      "GaussianNB for continuous features",
      "MultinomialNB for counts and text",
      "Why 'naive' independence works anyway"
    ],
    concepts: ["Bayes' theorem", "GaussianNB", "MultinomialNB", "priors", "likelihood"]
  },
  {
    id: "08", file: "08_Pipelines.ipynb",
    title: "Pipelines", group: "Core models & workflow",
    tag: "Composing workflows", time: 35, motif: "axes", seed: 14,
    lead: "Stop running steps by hand. A Pipeline chains preprocessing and model into one object that fits, predicts and cross-validates without leaking — the professional way to build.",
    learn: [
      "Chain transforms and an estimator with Pipeline",
      "Route columns with ColumnTransformer",
      "Cross-validate the whole pipeline safely",
      "Tune steps by name with grid search"
    ],
    concepts: ["Pipeline", "ColumnTransformer", "make_pipeline", "named_steps"]
  },
  {
    id: "09", file: "09_Model_Selection_and_Evaluation.ipynb",
    title: "Model Selection & Evaluation", group: "Core models & workflow",
    tag: "CV, metrics, tuning", time: 55, motif: "scatter", seed: 41,
    lead: "How do you know a model is good — and that it'll stay good on data it's never seen? This is the chapter that separates honest results from fooling yourself.",
    learn: [
      "Estimate performance with cross-validation",
      "Choose the right metric for the job",
      "Search hyperparameters with GridSearchCV",
      "Read a confusion matrix and ROC curve"
    ],
    concepts: ["cross_val_score", "GridSearchCV", "ROC/AUC", "precision/recall", "confusion matrix"]
  },
  {
    id: "10", file: "10_Feature_Selection.ipynb",
    title: "Feature Selection", group: "Core models & workflow",
    tag: "Choosing features", time: 35, motif: "lattice", seed: 47,
    lead: "More columns is not more signal. Feature selection trims the inputs to the ones that matter — for simpler, faster, more honest models.",
    learn: [
      "Filter features with univariate tests",
      "Rank with SelectKBest",
      "Eliminate recursively with RFE",
      "Use model-based importances"
    ],
    concepts: ["SelectKBest", "RFE", "VarianceThreshold", "importances"]
  },
  {
    id: "11", file: "11_Nearest_Neighbors.ipynb",
    title: "Nearest Neighbors", group: "Advanced topics",
    tag: "kNN methods", time: 30, motif: "neighbors", seed: 6,
    lead: "No training, just memory. kNN classifies a point by asking its closest neighbours to vote — a model that makes distance, and the curse of dimensionality, tangible.",
    learn: [
      "Classify with KNeighborsClassifier",
      "Pick k and the distance metric",
      "Feel the curse of dimensionality",
      "Why scaling is non-negotiable here"
    ],
    concepts: ["KNeighbors", "distance metric", "k", "curse of dimensionality"]
  },
  {
    id: "12", file: "12_Clustering.ipynb",
    title: "Clustering", group: "Advanced topics",
    tag: "Unsupervised grouping", time: 45, motif: "clusters", seed: 9,
    lead: "Finding structure with no labels at all. Clustering groups data by similarity — discovering segments, patterns and shapes you didn't know were there.",
    learn: [
      "Partition with KMeans and choose k",
      "Find dense regions with DBSCAN",
      "Build hierarchies with Agglomerative",
      "Evaluate clusters without ground truth"
    ],
    concepts: ["KMeans", "DBSCAN", "Agglomerative", "silhouette", "inertia"]
  },
  {
    id: "13", file: "13_Anomaly_Detection.ipynb",
    title: "Anomaly Detection", group: "Advanced topics",
    tag: "Outlier detection", time: 35, motif: "anomaly", seed: 13,
    lead: "Sometimes the interesting point is the one that doesn't fit. Anomaly detection flags the rare, the broken and the fraudulent against a backdrop of normal.",
    learn: [
      "Isolate outliers with IsolationForest",
      "Score locally with Local Outlier Factor",
      "Set contamination and thresholds",
      "Evaluate when positives are rare"
    ],
    concepts: ["IsolationForest", "LocalOutlierFactor", "contamination", "novelty"]
  },
  {
    id: "14", file: "14_Support_Vector_Machines.ipynb",
    title: "Support Vector Machines", group: "Advanced topics",
    tag: "Margins & kernels", time: 50, motif: "margin", seed: 8,
    lead: "Draw the widest possible street between classes. SVMs find the maximum-margin boundary, and the kernel trick lets that boundary curve through invisible higher dimensions.",
    learn: [
      "Maximise the margin with SVC",
      "Bend boundaries with the kernel trick",
      "Tune C and gamma",
      "Regress with SVR"
    ],
    concepts: ["SVC", "margin", "kernel trick", "C", "gamma", "support vectors"]
  },
  {
    id: "14b", file: "14b_SVM_with_PCA_Extra.ipynb",
    title: "SVM with PCA", group: "Advanced topics",
    tag: "Dimensionality reduction", time: 30, motif: "project", seed: 17, kind: "extra",
    lead: "An extra: squeeze the dimensions, then classify. PCA rotates data onto the axes that carry the most variance — fewer features, faster SVMs, and a picture you can actually plot.",
    learn: [
      "Reduce dimensions with PCA",
      "Read explained-variance ratios",
      "Feed components into an SVM",
      "Visualise classes in 2D"
    ],
    concepts: ["PCA", "explained variance", "components", "whitening"]
  },
  {
    id: "15", file: "15_Imbalanced_Classes.ipynb",
    title: "Imbalanced Classes", group: "Advanced topics",
    tag: "Resampling & weighting", time: 35, motif: "anomaly", seed: 27,
    lead: "When 99% of your data is one class, accuracy lies. This chapter is about catching the rare event that actually matters — fraud, disease, failure.",
    learn: [
      "See why accuracy misleads here",
      "Re-weight classes with class_weight",
      "Oversample with SMOTE, undersample the majority",
      "Score with precision, recall and F1"
    ],
    concepts: ["class_weight", "SMOTE", "resampling", "F1", "PR curve"]
  },
  {
    id: "16", file: "16_Ensemble_Methods.ipynb",
    title: "Ensemble Methods", group: "Advanced topics",
    tag: "Bagging & boosting", time: 55, motif: "tree", seed: 33,
    lead: "Many weak models, one strong verdict. Ensembles combine trees by the hundred — bagging to reduce variance, boosting to reduce bias — and routinely top the leaderboard.",
    learn: [
      "Average many trees with RandomForest",
      "Correct errors with GradientBoosting",
      "Combine models with Voting / Stacking",
      "Read importances and tune the ensemble"
    ],
    concepts: ["RandomForest", "GradientBoosting", "bagging", "boosting", "VotingClassifier"]
  }
];

window.AI_GROUPS = ["Foundations", "Core models & workflow", "Advanced topics"];

/* per-chapter theme accents — each topic owns a hue, chosen to fit the idea */
window.AI_ACCENTS = {
  "01":  "#5fd0e6", // NumPy — luminous cyan, the substrate
  "01b": "#6aa7f0", // NumPy Reference — azure
  "02":  "#5fd896", // Pandas — bamboo emerald
  "03":  "#f0c46a", // Plotting — chart amber
  "04":  "#7c9bf0", // Linear Models — cobalt
  "05":  "#6fe0c4", // Preprocessing — clean mint
  "06":  "#8ed96f", // Decision Trees — leaf green
  "07":  "#b39bf0", // Naive Bayes — probabilistic lavender
  "08":  "#f0926a", // Pipelines — conduit copper
  "09":  "#e06ad4", // Model Selection — judge's magenta
  "10":  "#d4e06a", // Feature Selection — sieve chartreuse
  "11":  "#54e0cf", // Nearest Neighbors — proximity turquoise
  "12":  "#f085c8", // Clustering — orchid pink
  "13":  "#f0716a", // Anomaly Detection — alert red
  "14":  "#9b8cf0", // SVM — kernel violet
  "14b": "#c98af0", // SVM + PCA — projected orchid
  "15":  "#f06a92", // Imbalanced Classes — rare rose
  "16":  "#62c97e"  // Ensembles — forest green
};
