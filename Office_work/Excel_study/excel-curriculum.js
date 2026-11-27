/* Reviewed Excel curriculum and deterministic self-assessment.
   No DOM, storage, accounts, network, scenario lookup or executable lesson data.
   Keep released definitions/engines addressable when adding a new version. */
(function (global) {
  'use strict';
  const syntax = global.CommonplaceExcelFormulaSyntax;
  if (!syntax) throw Error('Load Excel formula syntax before the curriculum.');
  const clone = value => JSON.parse(JSON.stringify(value));
  function freeze(value) {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  function exact(records, ref, kind) {
    if (!ref || Object.getPrototypeOf(ref) !== Object.prototype ||
        Object.keys(ref).sort().join() !== 'id,version' ||
        typeof ref.id !== 'string' || !Number.isSafeInteger(ref.version))
      throw Error('An exact ' + kind + ' ID and version are required.');
    const found = records.find(item => item.id === ref.id && item.version === ref.version);
    if (!found) throw Error('Unsupported ' + kind + ' version.');
    return found;
  }
  const worksheet = fn => ({
    inputCells: ['B2', 'B3', 'B4'], outputCell: 'B5', range: 'B2:B4',
    formula: '=' + fn + '(B2:B4)',
  });
  const formulaFunctions = ['SUM', 'AVERAGE', 'COUNT', 'MIN', 'MAX'];
  const referenceLessons = [
    { id: 'relative-line-totals', title: 'Relative references — Line totals',
      concept: 'A reference without dollar signs, such as B3, moves by the same number of rows and columns as the copied formula. Multiply the quantity by its unit price, then copy the formula down so each product uses its own row.',
      task: 'Calculate every line total by multiplying quantity by unit price. Use relative references so copying down follows each product row.',
      question: '=B3*C3 in D3 is copied one row down to D4. Which formula results?',
      choices: ['=B4*C4', '=B3*C3', '=$B$3*$C$3'], answer: 0,
      explanation: 'Both references are relative, so their row numbers increase by one: =B4*C4.',
      worksheet: { sourceCell: 'D3', targetCells: ['D4', 'D5'],
        inputCells: ['B3', 'C3', 'B4', 'C4', 'B5', 'C5'], formula: '=B3*C3' } },
    { id: 'absolute-rate', title: 'Absolute references — One conversion rate',
      concept: 'An absolute reference locks both parts of a cell address: $F$2 keeps column F and row 2 fixed when a formula is copied. Multiply each JPY amount by the fictional PHP-per-JPY rate in F2; the amount changes row, but every formula keeps the same rate cell.',
      task: 'Convert every JPY amount to PHP with the one fictional rate in F2. Keep the amount relative and lock both parts of the rate reference.',
      question: '=B3*$F$2 in C3 is copied down to C4. Which formula results?',
      choices: ['=B4*F3', '=B4*$F$2', '=$B$3*$F$2'], answer: 1,
      explanation: 'B3 moves to B4. Both dollar signs in $F$2 keep the rate in the same cell.',
      worksheet: { sourceCell: 'C3', targetCells: ['C4', 'C5'],
        inputCells: ['B3', 'B4', 'B5', 'F2'], formula: '=B3*$F$2' } },
    { id: 'mixed-quotation', title: 'Mixed references — A quotation grid',
      concept: 'A mixed reference locks one part of the address. $B3 keeps the unit-price column B while its row can change. C$2 keeps the quantity row 2 while its column can change. Together they let one formula fill a quotation grid across and down.',
      task: 'Calculate both quantity options for both products. Lock the unit-price column and the quantity row so the formula copies across and down.',
      question: '=$B3*C$2 in C3 is copied to D4: one column right and one row down. Which formula results?',
      choices: ['=$B3*C$2', '=C4*D3', '=$B4*D$2'], answer: 2,
      explanation: 'The locked column B stays fixed, the relative row becomes 4, the relative column C becomes D, and locked row 2 stays fixed.',
      worksheet: { sourceCell: 'C3', targetCells: ['D3', 'C4', 'D4'],
        inputCells: ['B3', 'B4', 'C2', 'D2'], formula: '=$B3*C$2' } },
    { id: 'relative-unit-cost', title: 'Relative references — Cost per unit',
      concept: 'Divide a batch cost by the number of usable units to find cost per unit. The slash / means division. Relative references follow each batch when you copy down. Dividing by zero, including an empty denominator in this practice sheet, gives #DIV/0!.',
      task: 'Calculate cost per usable unit for all three batches. Divide the total cost by that row’s usable units, then copy down.',
      question: 'B3 is a batch cost of 3600 JPY and C3 contains 12 usable units. Which formula gives its cost per unit?',
      choices: ['=B3/C3', '=C3/B3', '=B3*C3'], answer: 0,
      explanation: '=B3/C3 divides 3600 JPY by 12 units, giving 300 JPY per unit. Reversing the operands changes the meaning.',
      worksheet: { sourceCell: 'D3', targetCells: ['D4', 'D5'],
        inputCells: ['B3', 'C3', 'B4', 'C4', 'B5', 'C5'], formula: '=B3/C3' } },
  ];
  const tableColumns = ['id', 'item', 'status', 'quantity', 'unitPrice', 'discount', 'shipDate'];
  const tableNumberColumns = ['quantity', 'unitPrice', 'discount', 'shipDate'];
  const tableFormats = ['general', 'integer', 'decimal', 'jpy', 'php', 'percent', 'date'];
  const tableStatuses = ['Ready', 'Reserved', 'Shipped'];
  const tableWorksheet = { range: 'A1:G7', rowCount: 6, columns: tableColumns };
  const tableLessons = [
    { id: 'number-formats', title: 'Number formats — Read business values',
      concept: 'A number format changes how a value appears, not the value stored in the cell. Show quantities as whole numbers, prices in their original currency, discounts as percentages and shipping dates as dates. Choosing a currency format does not convert an amount to another currency.',
      task: 'Format quantity as an integer, unit price in the example’s currency, discount as a percentage and ship date as a date. Keep the underlying values unchanged.',
      question: 'A discount cell stores 0.15. What does a percentage format display?',
      choices: ['15.0%', '0.15%', 'The stored value becomes 15'], answer: 0,
      explanation: 'This percentage format displays 0.15 as 15.0%. The stored value remains 0.15.',
      goal: { formats: { quantity: 'integer', unitPrice: 'scenario-currency', discount: 'percent', shipDate: 'date' } } },
    { id: 'create-table', title: 'Tables — Keep related records together',
      concept: 'An Excel table gives a related range a name, headers and table controls. Each row is one complete record. Include every column and all six records so a product’s identity, status, quantities, price and shipping date stay together.',
      task: 'Create the PracticeItems table over A1:G7, using the existing header row and banded rows. Keep every record and value.',
      question: 'Which range includes the seven headers and all six records in this worksheet?',
      choices: ['A2:G7', 'A1:G7', 'D1:D7'], answer: 1,
      explanation: 'A1:G7 includes the header row and all seven fields for each of the six records.',
      goal: { table: { name: 'PracticeItems', range: 'A1:G7', headers: true, banded: true } } },
    { id: 'sort-records', title: 'Sorting — Move complete records',
      concept: 'Sort quantities from smallest to largest to see low stock first. A numeric sort puts 2 before 10. Move the whole record, never only the quantity cells, so prices and dates remain attached to the same SKU. Editing a value does not automatically sort again.',
      task: 'Sort the full table by quantity, smallest to largest. Keep all six complete records visible and preserve their original values.',
      question: 'How should quantities 2, 10 and 6 appear in a smallest-to-largest numeric sort?',
      choices: ['10, 2, 6', '6, 2, 10', '2, 6, 10'], answer: 2,
      explanation: 'Numeric order is 2, 6, 10. Sorting complete records keeps every quantity with its original SKU and other fields.',
      goal: { sort: { column: 'quantity', direction: 'asc' } } },
    { id: 'filter-records', title: 'Filtering — Focus without deleting',
      concept: 'A filter hides records that do not match your conditions; it does not delete them. Conditions on different columns work together. Show only Ready records with at least 5 units, then clear the filter to see every record again. Reapply the filter after editing a value.',
      task: 'Show only Ready records with quantity at least 5. Use both conditions and keep every original record stored in the table.',
      question: 'With Status = Ready and Quantity at least 5, which record remains visible?',
      choices: ['Reserved, quantity 10', 'Ready, quantity 6', 'Ready, quantity 2'], answer: 1,
      explanation: 'Both conditions must be true. Ready with quantity 6 matches; the other records are hidden, not removed.',
      goal: { filters: { status: 'Ready', minimumQuantity: 5 } } },
    { id: 'validate-entry', title: 'Data validation — Prevent invalid entries',
      concept: 'Validation can restrict new entries to a list or a number range. This practice requires the exact status spelling Ready, Reserved or Shipped, and whole quantities from 0 to 10000. Applying a rule does not repair earlier invalid values. Check existing data separately; this practice blocks invalid edits while a rule is enabled.',
      task: 'Enable the status-list rule and the whole-number quantity rule. Confirm all current records satisfy both rules and preserve the original values.',
      question: 'What happens to an existing quantity of -2 when you add a rule requiring whole numbers from 0 to 10000?',
      choices: ['It is automatically changed to 0', 'The row is deleted', 'It remains and needs a separate correction'], answer: 2,
      explanation: 'Applying validation does not rewrite existing data. The earlier -2 remains invalid and needs to be corrected separately.',
      goal: { validation: { quantity: true, status: true } } },
  ];
  const decisionLesson = {
    id: 'if-minimum-target', title: 'IF — Decide whether a target is met',
    concept: 'IF checks a condition and returns one of two results. Use >= to include equality. Put text results inside double quotes. The same decision can respond to changing inputs without manually replacing the result.',
    task: 'For each row, return Ready when the recorded value is at least the minimum target; otherwise return Review.',
    question: 'Actual stock and the minimum target are both 5. What does IF(5>=5,"Ready","Review") return?',
    choices: ['Ready', 'Review', 'An error'], answer: 0,
    explanation: 'Greater than or equal to includes equality, so the condition is true and IF returns Ready.',
    worksheet: { inputCells: ['B2','C2','B3','C3','B4','C4'], outputCells: ['D2','D3','D4'],
      formula: '=IF(B2>=C2,"Ready","Review")' },
  };
  const conditionalLesson = {
    id: 'highlight-below-target', title: 'Conditional formatting — Highlight values below a target',
    concept: 'Conditional formatting changes how a cell looks when a rule is true. It does not change the stored value. A Less Than rule excludes a value equal to its threshold, and the formatting updates when a value changes.',
    task: 'Highlight only the values strictly below the given target, using a light red fill and dark red text. Apply the rule to the whole B2:B4 range.',
    question: 'A Less Than 5 rule is applied to values 4, 5 and 6. Which value is highlighted?',
    choices: ['4 only', '4 and 5', 'All three'], answer: 0,
    explanation: 'Only 4 is strictly less than 5. Equality does not qualify, and none of the underlying values changes.',
    worksheet: { inputCells: ['B2','B3','B4'], goal: { range: 'B2:B4', operator: 'lt', style: 'red' } },
  };
  const lookupLessons = [
    { id:'xlookup-exact', fn:'XLOOKUP', title:'XLOOKUP — Find a price by item code',
      concept:'XLOOKUP searches a range for a key and returns the corresponding value from another range. Exact matching is the default. A missing code returns #N/A; this is not a zero price.',
      task:'Use XLOOKUP in F2 to retrieve the amount for the code in E2 from the complete catalog.',
      question:'What does an exact XLOOKUP return when the code is absent and no fallback is supplied?',
      choices:['#N/A','The nearest price','Zero'], answer:0,
      explanation:'An absent exact match returns #N/A. Check the code or the catalog; do not treat the error as a price.',
      worksheet:{ formula:'=XLOOKUP(E2,A2:A4,C2:C4)', query:'E2', search:'A2:A4', returns:'C2:C4', output:'F2' } },
    { id:'vlookup-exact', fn:'VLOOKUP', title:'VLOOKUP — Find a price in a catalog',
      concept:'VLOOKUP searches the first column of its table range and returns a value from a column to its right. Column numbers count from the first column of the range. Use FALSE or 0 for an exact match.',
      task:'Use VLOOKUP in F2 to retrieve the amount for the code in E2 from the complete three-column catalog. Specify exact matching.',
      question:'For A2:C4, which column index retrieves the value in column C?',
      choices:['1','2','3'], answer:2,
      explanation:'A is column 1, B is 2, and C is 3 in that table. FALSE or 0 selects exact matching.',
      worksheet:{ formula:'=VLOOKUP(E2,A2:C4,3,FALSE)', query:'E2', search:'A2:A4', returns:'C2:C4', output:'F2' } },
  ];
  const summaryLessons = [
    { id:'sumif-status', fn:'SUMIF', title:'SUMIF — Add amounts for one status',
      concept:'SUMIF tests one range and adds corresponding numbers from a sum range. The rows must align. A criterion can reference a cell, so changing that cell updates the total.',
      task:'Add the amounts in D2:D7 for rows whose status in B2:B7 matches F2.',
      question:'SUMIF adds matching amounts, including a matching amount of zero. Does it count matching rows instead?',
      choices:['No, it adds their amounts','Yes, it counts rows','It always adds every amount'],answer:0,
      explanation:'SUMIF adds corresponding amounts. COUNTIF counts matches instead.',
      worksheet:{formula:'=SUMIF(B2:B7,F2,D2:D7)',output:'G2',sumRange:'D2:D7',pairs:[{range:'B2:B7',criterion:'F2'}]} },
    { id:'sumifs-status-group', fn:'SUMIFS', title:'SUMIFS — Add amounts meeting two conditions',
      concept:'SUMIFS puts the sum range first, followed by criteria-range/criterion pairs. All conditions must be true on the same row (AND). The two pairs can be supplied in either order.',
      task:'Add amounts in D2:D7 only when status matches F2 AND the group matches F3.',
      question:'A row matches the status but not the group. Does SUMIFS include it?',
      choices:['Yes','No','Only when its amount is zero'],answer:1,
      explanation:'Both conditions must be true on the same row. A status match alone is insufficient.',
      worksheet:{formula:'=SUMIFS(D2:D7,B2:B7,F2,C2:C7,F3)',output:'G2',sumRange:'D2:D7',
        pairs:[{range:'B2:B7',criterion:'F2'},{range:'C2:C7',criterion:'F3'}]} },
    { id:'countif-status', fn:'COUNTIF', title:'COUNTIF — Count matching records',
      concept:'COUNTIF counts cells that meet one criterion. It does not add monetary values or quantities. A matching record with a zero amount still counts as one.',
      task:'Count the records in B2:B7 whose status matches F2.',
      question:'Three rows match the status; their amounts are 10, 20 and 0. What does COUNTIF return?',
      choices:['30','2','3'],answer:2,
      explanation:'All three status cells match, including the row whose amount is zero. COUNTIF returns 3.',
      worksheet:{formula:'=COUNTIF(B2:B7,F2)',output:'G2',sumRange:null,pairs:[{range:'B2:B7',criterion:'F2'}]} },
  ];
  const capabilities = freeze([
    ...summaryLessons.map(lesson=>({id:'excel.summary.'+lesson.id+'.v1',version:1,
      kind:'conditional-summary',engine:'bounded-conditional-summary.v1',worksheet:lesson.worksheet})),
    ...lookupLessons.map(lesson=>({ id:'excel.lookup.'+lesson.id+'.v1', version:1,
      kind:'lookup-formula', engine:'bounded-lookup.v1', worksheet:lesson.worksheet })),
    { id: 'excel.conditional.highlight-below-target.v1', version: 1, kind: 'conditional-formatting',
      engine: 'bounded-conditional.v1', worksheet: conditionalLesson.worksheet },
    { id: 'excel.decisions.if-minimum-target.v1', version: 1, kind: 'decision-formula',
      engine: 'bounded-if.v1', worksheet: decisionLesson.worksheet },
    { id: 'explanation.text.v1', version: 1, kind: 'explanation' },
    ...formulaFunctions.map(fn => ({
      id: 'excel.' + fn.toLowerCase() + '.b2-b4.v1', version: 1, kind: 'formula',
      fn, engine: 'bounded-aggregate.v1', worksheet: worksheet(fn),
      // Only this wire activity is accepted by today's central material schema.
      ...(fn === 'SUM' ? { activity_type: 'sum-column' } : {}),
    })),
    ...referenceLessons.map(lesson => ({
      id: 'excel.references.' + lesson.id + '.v1', version: 1,
      kind: 'reference-formula', engine: 'bounded-reference-arithmetic.v1',
      worksheet: lesson.worksheet,
    })),
    ...tableLessons.map(lesson => ({
      id: 'excel.tables.' + lesson.id + '.v1', version: 1,
      kind: 'business-table', engine: 'bounded-business-table.v1', worksheet: tableWorksheet,
    })),
    { id: 'excel.tables.create-table.v2', version: 2,
      kind: 'business-table', engine: 'bounded-business-table.v1', worksheet: tableWorksheet,
      table_name_max_length: 32 },
  ]);
  const runtimes = freeze([
    {id:'personal-conditional-summaries',version:1,engine:'bounded-conditional-summary.v1',
      input_policy:'exact-text-and-required-numbers',
      capabilities:['explanation.text.v1',...summaryLessons.map(l=>'excel.summary.'+l.id+'.v1')],
      lessons:summaryLessons.map(l=>({id:l.id,version:1}))},
    { id:'personal-lookups', version:1, engine:'bounded-lookup.v1',
      input_policy:'text-codes-and-numbers',
      capabilities:['explanation.text.v1',...lookupLessons.map(l=>'excel.lookup.'+l.id+'.v1')],
      lessons:lookupLessons.map(l=>({id:l.id,version:1})) },
    { id: 'personal-conditional-formatting', version: 1, engine: 'bounded-conditional.v1',
      input_policy: 'required-numbers',
      capabilities: ['explanation.text.v1', 'excel.conditional.highlight-below-target.v1'],
      lessons: [{ id: 'highlight-below-target', version: 1 }] },
    { id: 'personal-decisions', version: 1, engine: 'bounded-if.v1',
      input_policy: 'required-numbers',
      capabilities: ['explanation.text.v1', 'excel.decisions.if-minimum-target.v1'],
      lessons: [{ id: 'if-minimum-target', version: 1 }] },
    { id: 'personal-formulas', version: 1, engine: 'bounded-aggregate.v1',
      input_policy: 'numbers-or-blanks',
      // Pin this release; registering a future capability must not widen v1.
      capabilities: ['explanation.text.v1', 'excel.sum.b2-b4.v1',
        'excel.average.b2-b4.v1', 'excel.count.b2-b4.v1',
        'excel.min.b2-b4.v1', 'excel.max.b2-b4.v1'],
      lessons: [{ id: 'sum', version: 1 }, { id: 'average', version: 1 },
        { id: 'count', version: 1 }, { id: 'min', version: 1 }, { id: 'max', version: 1 }],
      shape_error: 'Three input cells are required.',
      formula_error: 'Use SUM, AVERAGE, COUNT, MIN or MAX on B2:B4. Keep each function name and cell reference together.' },
    { id: 'assigned-sum', version: 1, engine: 'bounded-aggregate.v1',
      input_policy: 'required-numbers',
      capabilities: ['explanation.text.v1', 'excel.sum.b2-b4.v1'],
      lessons: [{ id: 'sum', version: 1 }],
      shape_error: 'Enter a valid number in all three quantity cells.',
      formula_error: 'Enter a SUM formula for B2:B4. Keep SUM and each cell reference together.' },
    { id: 'personal-references', version: 1, engine: 'bounded-reference-arithmetic.v1',
      input_policy: 'arithmetic-cells', worksheet_bounds: { columns: 6, rows: 12 },
      operators: ['*', '/'],
      capabilities: ['explanation.text.v1',
        'excel.references.relative-line-totals.v1', 'excel.references.absolute-rate.v1',
        'excel.references.mixed-quotation.v1', 'excel.references.relative-unit-cost.v1'],
      lessons: [{ id: 'relative-line-totals', version: 1 }, { id: 'absolute-rate', version: 1 },
        { id: 'mixed-quotation', version: 1 }, { id: 'relative-unit-cost', version: 1 }],
      formula_error: 'Use two cell references from A1:F12 joined by * or /. Keep each reference and its dollar signs together.' },
    { id: 'personal-tables', version: 1, engine: 'bounded-business-table.v1',
      row_count: 6, columns: tableColumns, numeric_columns: tableNumberColumns,
      formats: tableFormats, statuses: tableStatuses,
      capabilities: ['explanation.text.v1', 'excel.tables.number-formats.v1',
        'excel.tables.create-table.v1', 'excel.tables.sort-records.v1',
        'excel.tables.filter-records.v1', 'excel.tables.validate-entry.v1'],
      lessons: [{ id: 'number-formats', version: 1 }, { id: 'create-table', version: 1 },
        { id: 'sort-records', version: 1 }, { id: 'filter-records', version: 1 },
        { id: 'validate-entry', version: 1 }] },
    { id: 'personal-tables', version: 2, engine: 'bounded-business-table.v1',
      row_count: 6, columns: tableColumns, numeric_columns: tableNumberColumns,
      formats: tableFormats, statuses: tableStatuses, table_name_max_length: 32,
      capabilities: ['explanation.text.v1', 'excel.tables.number-formats.v1',
        'excel.tables.create-table.v2', 'excel.tables.sort-records.v1',
        'excel.tables.filter-records.v1', 'excel.tables.validate-entry.v1'],
      lessons: [{ id: 'number-formats', version: 2 }, { id: 'create-table', version: 2 },
        { id: 'sort-records', version: 2 }, { id: 'filter-records', version: 2 },
        { id: 'validate-entry', version: 2 }] },
  ]);
  const rubrics = freeze([
    {id:'conditional-summary-foundations',version:1,engine:'conditional-summary-foundations.v1',
      runtime:{id:'personal-conditional-summaries',version:1},
      criteria:['summary-function','criteria-ranges','criteria-references','sum-range','summary-result'],
      independent_criteria:['original-inputs']},
    { id:'lookup-foundations', version:1, engine:'lookup-foundations.v1',
      runtime:{id:'personal-lookups',version:1},
      criteria:['lookup-function','lookup-key','search-range','return-range','lookup-result'],
      independent_criteria:['original-inputs'] },
    { id: 'conditional-foundations', version: 1, engine: 'conditional-foundations.v1',
      runtime: { id: 'personal-conditional-formatting', version: 1 },
      criteria: ['rule-range', 'rule-operator', 'rule-threshold', 'rule-style', 'matched-cells'],
      independent_criteria: ['original-inputs'] },
    { id: 'decision-foundations', version: 1, engine: 'decision-foundations.v1',
      runtime: { id: 'personal-decisions', version: 1 },
      criteria_per_cell: ['decision-condition', 'decision-result'],
      independent_criteria: ['original-inputs'] },
    { id: 'formula-foundations', version: 1, engine: 'formula-foundations.v1',
      runtime: { id: 'personal-formulas', version: 1 },
      criteria: ['requested-formula', 'valid-calculation'],
      independent_criteria: ['original-inputs'] },
    { id: 'worksheet-criteria', version: 1, engine: 'worksheet-criteria.v1',
      response_limit: 512 },
    { id: 'assigned-practice', version: 1, engine: 'assigned-practice.v1',
      runtime: { id: 'assigned-sum', version: 1 },
      activities: ['guided-sum-v1', 'independent-match-v1',
        'independent-format-v1', 'independent-copy-v1'] },
    { id: 'reference-foundations', version: 1, engine: 'reference-foundations.v1',
      runtime: { id: 'personal-references', version: 1 },
      criteria_per_cell: ['reference-pattern', 'valid-calculation'],
      independent_criteria: ['original-inputs'] },
    { id: 'table-foundations', version: 1, engine: 'table-foundations.v1',
      runtime: { id: 'personal-tables', version: 1 },
      independent_criteria: ['original-records'] },
    { id: 'table-foundations', version: 2, engine: 'table-foundations.v2',
      runtime: { id: 'personal-tables', version: 2 },
      independent_criteria: ['original-records'] },
  ]);
  const lessonContent = [
    {id:"sum",fn:"SUM",title:"SUM — Add values",concept:"SUM adds numeric cells in a range. Empty cells are ignored; a zero is a number. Use SUM instead of typing a fixed total so Excel can recalculate when inputs change.",task:"Calculate the total",question:"Which formula adds all three numeric cells?",choices:["=SUM(B2:B4)","=COUNT(B2:B4)","=SUM(A2:A4)"],answer:0,explanation:"SUM(B2:B4) adds the numbers in column B from rows 2 through 4."},
    {id:"average",fn:"AVERAGE",title:"AVERAGE — Find the mean",concept:"AVERAGE adds the numeric cells and divides by the number of numeric cells. Blank cells do not contribute to the count, but zero does. A decimal answer is valid even for item counts.",task:"Find the average of the recorded values",question:"B2 contains 12, B3 is blank and B4 contains 6. What does AVERAGE(B2:B4) return?",choices:["6","9","18"],answer:1,explanation:"The sum is 18 and there are two numeric cells, so 18 ÷ 2 = 9."},
    {id:"count",fn:"COUNT",title:"COUNT — Count numeric cells",concept:"COUNT counts cells containing numbers, not the total quantity of items. A numeric zero counts as one cell. Blank cells and text in a referenced range are ignored.",task:"Count the entries with recorded numbers",question:"B2 contains 0, B3 is blank and B4 contains 5. What does COUNT(B2:B4) return?",choices:["5","1","2"],answer:2,explanation:"Zero and five are both numbers; only the blank is excluded."},
    {id:"min",fn:"MIN",title:"MIN — Find the smallest value",concept:"MIN returns the smallest numeric value in a range. It ignores blank cells. It does not tell you the corresponding product name; that requires a lookup or another method.",task:"Find the smallest recorded value",question:"Which formula finds the smallest numeric value in B2:B4?",choices:["=MIN(B2:B4)","=MAX(B2:B4)","=AVERAGE(B2:B4)"],answer:0,explanation:"MIN returns the smallest of the numeric entries."},
    {id:"max",fn:"MAX",title:"MAX — Find the largest value",concept:"MAX returns the largest numeric value in a range. It ignores blanks, and it works with negative numbers too. Use it to identify the highest quantity or cost.",task:"Find the largest recorded value",question:"The three recorded values are -7, -2 and -5. Which is MAX?",choices:["-7","-2","0"],answer:1,explanation:"-2 is the greatest number, even though all entries are negative."}
  ];
  const lessons = freeze([...summaryLessons.map(item=>({...item,version:1,
    capability_id:'excel.summary.'+item.id+'.v1',runtime:{id:'personal-conditional-summaries',version:1},
    rubric:{id:'conditional-summary-foundations',version:1}})), ...lookupLessons.map(item=>({ ...item, version:1,
    capability_id:'excel.lookup.'+item.id+'.v1',runtime:{id:'personal-lookups',version:1},
    rubric:{id:'lookup-foundations',version:1} })), { ...conditionalLesson, version: 1,
    capability_id: 'excel.conditional.highlight-below-target.v1',
    runtime: { id: 'personal-conditional-formatting', version: 1 },
    rubric: { id: 'conditional-foundations', version: 1 },
  }, { ...decisionLesson, version: 1,
    capability_id: 'excel.decisions.if-minimum-target.v1',
    runtime: { id: 'personal-decisions', version: 1 },
    rubric: { id: 'decision-foundations', version: 1 },
  }, ...lessonContent.map(item => ({
    ...item, version: 1,
    capability_id: 'excel.' + item.id + '.b2-b4.v1',
    runtime: { id: 'personal-formulas', version: 1 },
    rubric: { id: 'formula-foundations', version: 1 },
    worksheet: worksheet(item.fn),
  })), ...referenceLessons.map(item => ({
    ...item, version: 1,
    capability_id: 'excel.references.' + item.id + '.v1',
    runtime: { id: 'personal-references', version: 1 },
    rubric: { id: 'reference-foundations', version: 1 },
  })), ...tableLessons.map(item => ({
    ...item, version: 1, capability_id: 'excel.tables.' + item.id + '.v1',
    runtime: { id: 'personal-tables', version: 1 },
    rubric: { id: 'table-foundations', version: 1 }, worksheet: tableWorksheet,
  })), ...tableLessons.map(item => ({
    ...item, version: 2,
    capability_id: 'excel.tables.' + item.id + (item.id === 'create-table' ? '.v2' : '.v1'),
    runtime: { id: 'personal-tables', version: 2 },
    rubric: { id: 'table-foundations', version: 2 }, worksheet: tableWorksheet,
  }))]);
  function resolveCapability(id) {
    const found = capabilities.find(item => item.id === id);
    if (!found) throw Error('Unsupported Excel capability.');
    return found;
  }
  const resolveLesson = ref => exact(lessons, ref, 'lesson');
  const resolveRuntime = ref => exact(runtimes, ref, 'runtime');
  const resolveRubric = ref => exact(rubrics, ref, 'rubric');
  function numeric(values, policy, shapeError = 'Three input cells are required.') {
    if (!Array.isArray(values) || values.length !== 3 ||
        Object.keys(values).length !== 3 ||
        ![0, 1, 2].every(i => Object.hasOwn(values, i)))
      throw Error(shapeError);
    if (!['required-numbers', 'numbers-or-blanks'].includes(policy))
      throw Error('Unsupported numeric input policy.');
    return values.flatMap(value => {
      const number = syntax.numericCell(value, { allowBlank: policy === 'numbers-or-blanks' });
      return number === null ? [] : [number];
    });
  }
  // Reviewed evaluator implementations; imported content never supplies functions.
  const aggregates = Object.freeze({
    SUM: values => values.reduce((sum, value) => sum + value, 0),
    AVERAGE: values => values.reduce((sum, value) => sum + value, 0) / values.length,
    COUNT: values => values.length,
    MIN: values => values.length ? Math.min(...values) : 0,
    MAX: values => values.length ? Math.max(...values) : 0,
  });
  function evaluateFormula(runtimeRef, formula, values) {
    const runtime = resolveRuntime(runtimeRef);
    if (runtime.engine !== 'bounded-aggregate.v1') throw Error('Unsupported formula engine.');
    const parsed = syntax.parse(formula);
    const capability = parsed && runtime.capabilities.map(resolveCapability)
      .find(item => item.kind === 'formula' && item.fn === parsed.fn &&
        item.worksheet.range === parsed.range && item.engine === runtime.engine);
    if (!capability) throw Error(runtime.formula_error);
    const numbers = numeric(values, runtime.input_policy, runtime.shape_error), fn = capability.fn;
    if (fn === 'AVERAGE' && !numbers.length) return { fn, result: null, error: '#DIV/0!' };
    return { fn, result: Number(aggregates[fn](numbers).toPrecision(15)), error: null };
  }
  // F2 is a separate bounded engine. Unlike the fixed-range F1 comparison,
  // its tokens retain both locks because copying depends on their positions.
  const referenceGap = '(?: |\\r\\n)*';
  const referenceToken = '\\$?[A-F]\\$?(?:1[0-2]|[1-9])';
  const referencePattern = new RegExp('^' + referenceGap + '=' + referenceGap +
    '(' + referenceToken + ')' + referenceGap + '([*/])' + referenceGap +
    '(' + referenceToken + ')' + referenceGap + '$', 'i');
  const plain = value => !!value && Object.getPrototypeOf(value) === Object.prototype;
  function referenceRuntime(ref) {
    const runtime = resolveRuntime(ref);
    if (runtime.engine !== 'bounded-reference-arithmetic.v1' || runtime.input_policy !== 'arithmetic-cells')
      throw Error('A reference practice runtime is required.');
    return runtime;
  }
  function referenceParts(token) {
    const match = /^(\$?)([A-F])(\$?)(1[0-2]|[1-9])$/.exec(token.toUpperCase());
    return { column: match[2].charCodeAt(0) - 64, row: Number(match[4]),
      columnAbsolute: match[1] === '$', rowAbsolute: match[3] === '$',
      address: match[2] + match[4], token: token.toUpperCase() };
  }
  function parseReferenceFormula(runtimeRef, formula) {
    const runtime = referenceRuntime(runtimeRef);
    if (typeof formula !== 'string' || formula.length > 80) return null;
    const match = referencePattern.exec(formula);
    if (!match || match[0].length !== formula.length || !runtime.operators.includes(match[2])) return null;
    const left = referenceParts(match[1]), right = referenceParts(match[3]);
    return { left, operator: match[2], right, canonical: '=' + left.token + match[2] + right.token };
  }
  function referenceLocation(address) {
    if (typeof address !== 'string') throw Error('Choose a cell inside A1:F12.');
    const match = /^([A-F])(1[0-2]|[1-9])$/i.exec(address);
    if (!match || match[0].length !== address.length) throw Error('Choose a cell inside A1:F12.');
    return { column: match[1].toUpperCase().charCodeAt(0) - 64, row: Number(match[2]) };
  }
  function copyReferenceFormula(runtimeRef, formula, fromCell, toCell) {
    const runtime = referenceRuntime(runtimeRef), parsed = parseReferenceFormula(runtimeRef, formula);
    if (!parsed) throw Error(runtime.formula_error);
    const from = referenceLocation(fromCell), to = referenceLocation(toCell);
    const shift = ref => {
      const column = ref.column + (ref.columnAbsolute ? 0 : to.column - from.column);
      const row = ref.row + (ref.rowAbsolute ? 0 : to.row - from.row);
      if (column < 1 || column > runtime.worksheet_bounds.columns || row < 1 || row > runtime.worksheet_bounds.rows)
        throw Error('Copy goes outside the A1:F12 practice sheet.');
      return (ref.columnAbsolute ? '$' : '') + String.fromCharCode(64 + column) +
        (ref.rowAbsolute ? '$' : '') + row;
    };
    return '=' + shift(parsed.left) + parsed.operator + shift(parsed.right);
  }
  function evaluateReferenceFormula(runtimeRef, formula, cells) {
    const runtime = referenceRuntime(runtimeRef), parsed = parseReferenceFormula(runtimeRef, formula);
    if (!parsed) throw Error(runtime.formula_error);
    if (!plain(cells)) throw Error('A worksheet cell map is required.');
    const cell = ref => Object.hasOwn(cells, ref.address) ? cells[ref.address] : '';
    const raw = [cell(parsed.left), cell(parsed.right)];
    if (raw.some(value => typeof value === 'string' && value.trim().startsWith('=')))
      throw Error('References to formula cells are outside this practice.');
    let numbers;
    try { numbers = raw.map(value => syntax.numericCell(value, { allowBlank: true }) ?? 0); }
    catch { return { result: null, error: '#VALUE!' }; }
    if (parsed.operator === '/' && numbers[1] === 0) return { result: null, error: '#DIV/0!' };
    const calculated = parsed.operator === '*' ? numbers[0] * numbers[1] : numbers[0] / numbers[1];
    if (!Number.isFinite(calculated)) return { result: null, error: '#NUM!' };
    return { result: Number(calculated.toPrecision(15)), error: null };
  }
  function referenceFormulaMatches(runtimeRef, actual, expected) {
    const a = parseReferenceFormula(runtimeRef, actual), b = parseReferenceFormula(runtimeRef, expected);
    if (!a || !b || a.operator !== b.operator) return false;
    return (a.left.token === b.left.token && a.right.token === b.right.token) ||
      (a.operator === '*' && a.left.token === b.right.token && a.right.token === b.left.token);
  }
  function gradeReferences(rubricRef, exercise, formulas, cells) {
    const rubric = resolveRubric(rubricRef);
    if (rubric.engine !== 'reference-foundations.v1') throw Error('A reference lesson rubric is required.');
    const lesson = resolveLesson({ id: exercise?.lesson?.id, version: exercise?.lesson?.version });
    const runtime = referenceRuntime(rubric.runtime);
    if (lesson.rubric.id !== rubric.id || lesson.rubric.version !== rubric.version ||
        !['guided', 'independent'].includes(exercise.mode) ||
        !runtime.lessons.some(ref => ref.id === lesson.id && ref.version === lesson.version) ||
        !runtime.capabilities.includes(lesson.capability_id))
      throw Error('Reference lesson and rubric do not match.');
    const worksheet = lesson.worksheet, baseline = exercise.values;
    if (!plain(baseline) || Object.keys(baseline).sort().join() !== worksheet.inputCells.slice().sort().join())
      throw Error('Reference exercise inputs do not match the lesson.');
    worksheet.inputCells.forEach(address => syntax.numericCell(baseline[address]));
    const submitted = plain(formulas) ? formulas : {}, input = plain(cells) ? cells : {};
    const outputs = [worksheet.sourceCell, ...worksheet.targetCells];
    const formulaAt = address => Object.hasOwn(submitted, address) ? submitted[address] : '';
    // A reference to a submitted formula cell must not be mistaken for a blank
    // cached output. Chained/circular formulas are outside this bounded engine.
    const current = { ...input, ...Object.fromEntries(outputs.map(address => [address, formulaAt(address)])) };
    const criteria = [], evaluated = {};
    for (const address of outputs) {
      const expected = copyReferenceFormula(rubric.runtime, worksheet.formula, worksheet.sourceCell, address);
      const actual = formulaAt(address);
      criteria.push({ id: 'reference-pattern:' + address,
        label: address + ' uses the required references and dollar-sign locks',
        passed: referenceFormulaMatches(rubric.runtime, actual, expected) });
      try { evaluated[address] = evaluateReferenceFormula(rubric.runtime, actual, current); }
      catch (error) { evaluated[address] = { result: null, error: error.message }; }
      criteria.push({ id: 'valid-calculation:' + address,
        label: address + ' calculates successfully for its entered formula',
        passed: evaluated[address].error === null });
    }
    if (exercise.mode === 'independent')
      criteria.push({ id: 'original-inputs', label: 'Original exercise inputs preserved',
        passed: worksheet.inputCells.every(address => Object.hasOwn(input, address) &&
          numberMatches(input[address], baseline[address])) });
    return { ...result(criteria), evaluated };
  }
  // F4A: compare two numeric cells and return one of two literal strings.
  // No eval, nested formulas, arbitrary cell ranges or executable lesson data.
  function decisionRuntime(ref) {
    const runtime = resolveRuntime(ref);
    if (runtime.engine !== 'bounded-if.v1') throw Error('An IF practice runtime is required.');
    return runtime;
  }
  const ifGap = '(?: |\\r\\n)*';
  const ifRef = '(\\$?[BC]\\$?[234])';
  const ifText = '"([A-Za-z][A-Za-z ]{0,23})"';
  const ifPattern = new RegExp('^' + ifGap + '=' + ifGap + 'IF\\(' + ifGap +
    ifRef + ifGap + '(>=|<=|<>|=|>|<)' + ifGap + ifRef + ifGap + ',' +
    ifGap + ifText + ifGap + ',' + ifGap + ifText + ifGap + '\\)' + ifGap + '$', 'i');
  function parseDecisionFormula(runtimeRef, formula) {
    decisionRuntime(runtimeRef);
    const match = typeof formula === 'string' && formula.length <= 128 && ifPattern.exec(formula);
    if (!match || match[0].length !== formula.length)
      throw Error('Use IF with two B2:C4 references, a comparison and two quoted text results. Keep tokens together.');
    const address = value => value.replaceAll('$', '').toUpperCase();
    return { left: address(match[1]), operator: match[2], right: address(match[3]),
      whenTrue: match[4], whenFalse: match[5] };
  }
  function evaluateDecisionFormula(runtimeRef, formula, cells) {
    const parsed = parseDecisionFormula(runtimeRef, formula);
    if (!plain(cells)) throw Error('Worksheet inputs are required.');
    const number = address => {
      if (!Object.hasOwn(cells, address)) throw Error('Missing input ' + address + '.');
      return syntax.numericCell(cells[address]);
    };
    const a = number(parsed.left), b = number(parsed.right);
    const condition = { '>=': a >= b, '<=': a <= b, '>': a > b,
      '<': a < b, '=': a === b, '<>': a !== b }[parsed.operator];
    return { condition, result: condition ? parsed.whenTrue : parsed.whenFalse };
  }
  function gradeDecision(rubricRef, exercise, formulas, cells) {
    const rubric = resolveRubric(rubricRef);
    if (rubric.engine !== 'decision-foundations.v1') throw Error('An IF lesson rubric is required.');
    const lesson = resolveLesson({ id: exercise?.lesson?.id, version: exercise?.lesson?.version });
    const runtime = decisionRuntime(rubric.runtime);
    if (lesson.rubric.id !== rubric.id || lesson.rubric.version !== rubric.version ||
        !runtime.lessons.some(ref => ref.id === lesson.id && ref.version === lesson.version) ||
        !runtime.capabilities.includes(lesson.capability_id) ||
        !['guided', 'independent'].includes(exercise.mode))
      throw Error('IF lesson and rubric do not match.');
    const { inputCells, outputCells } = lesson.worksheet;
    const baseline = exercise.values;
    if (!plain(baseline) || Object.keys(baseline).sort().join() !== inputCells.slice().sort().join())
      throw Error('IF exercise inputs do not match the lesson.');
    inputCells.forEach(address => syntax.numericCell(baseline[address]));
    const input = plain(cells) ? cells : {}, submitted = plain(formulas) ? formulas : {};
    const criteria = [], evaluated = {};
    for (const cell of outputCells) {
      const row = cell.slice(1), left = 'B' + row, right = 'C' + row;
      let parsed = null;
      const formula = Object.hasOwn(submitted, cell) ? submitted[cell] : '';
      try { parsed = parseDecisionFormula(rubric.runtime, formula); } catch {}
      const conditionMatches = parsed && (
        (parsed.left === left && parsed.operator === '>=' && parsed.right === right) ||
        (parsed.left === right && parsed.operator === '<=' && parsed.right === left));
      criteria.push({ id: 'decision-condition:' + cell, label: cell + ' checks the required minimum (including equality)',
        passed: Boolean(conditionMatches) });
      let actual = null;
      try { actual = evaluateDecisionFormula(rubric.runtime, formula, input); } catch (error) {
        evaluated[cell] = { result: null, error: error.message };
      }
      if (actual) evaluated[cell] = { ...actual, error: null };
      // Check both branches, even if only one is selected by the current values.
      // A wrong condition can still earn result credit if both literal branches
      // are correct and the actual result matches the goal on current inputs.
      let expected = null;
      try { expected = evaluateDecisionFormula(rubric.runtime, '=IF(' + left + '>=' + right + ',"Ready","Review")', input); } catch {}
      criteria.push({ id: 'decision-result:' + cell, label: cell + ' returns the required Ready/Review result',
        passed: Boolean(parsed && actual && expected &&
          parsed.whenTrue === 'Ready' && parsed.whenFalse === 'Review' && actual.result === expected.result) });
    }
    if (exercise.mode === 'independent')
      criteria.push({ id: 'original-inputs', label: 'Original exercise inputs preserved',
        passed: inputCells.every(address => Object.hasOwn(input, address) && numberMatches(input[address], baseline[address])) });
    return { ...result(criteria), evaluated };
  }

  // F4B: one numeric cell-value rule. Raw cell values and applied styling
  // are separate; matching addresses are always derived, never accepted as input.
  const conditionalCells = ['B2','B3','B4'];
  const conditionalRanges = freeze({
    'B2:B4': conditionalCells, 'B2:B3': ['B2','B3'], 'B3:B4': ['B3','B4'],
    B2: ['B2'], B3: ['B3'], B4: ['B4'],
  });
  const conditionalOperators = ['lt','lte','gt','gte','eq'];
  const conditionalStyles = ['red','green','amber'];
  function conditionalRuntime(ref) {
    const runtime = resolveRuntime(ref);
    if (runtime.engine !== 'bounded-conditional.v1')
      throw Error('A conditional-formatting practice runtime is required.');
    return runtime;
  }
  function validateConditionalRule(runtimeRef, rule) {
    conditionalRuntime(runtimeRef);
    if (!plain(rule) || Object.keys(rule).sort().join() !== 'operator,range,style,threshold' ||
        typeof rule.range !== 'string' || !Object.hasOwn(conditionalRanges, rule.range) ||
        !conditionalOperators.includes(rule.operator) || !conditionalStyles.includes(rule.style))
      throw Error('Choose a supported range, comparison and format.');
    const threshold = syntax.numericCell(rule.threshold);
    return { range: rule.range, operator: rule.operator, threshold: String(threshold), style: rule.style };
  }
  function conditionalView(runtimeRef, rule, cells) {
    conditionalRuntime(runtimeRef);
    if (!plain(cells)) throw Error('Worksheet inputs are required.');
    const active = rule === null ? null : validateConditionalRule(runtimeRef, rule);
    const threshold = active ? syntax.numericCell(active.threshold) : null;
    const compare = (a,b,op) => ({ lt:a<b, lte:a<=b, gt:a>b, gte:a>=b, eq:a===b })[op];
    const invalid = [], highlighted = [];
    for (const address of conditionalCells) {
      let value;
      try {
        if (!Object.hasOwn(cells,address)) throw Error('Missing input');
        value = syntax.numericCell(cells[address]);
      } catch { invalid.push(address); continue; }
      if (active && conditionalRanges[active.range].includes(address) &&
          compare(value,threshold,active.operator)) highlighted.push(address);
    }
    return { highlighted, invalid, style: active?.style ?? null };
  }
  function gradeConditional(rubricRef, exercise, rule, cells) {
    const rubric = resolveRubric(rubricRef);
    if (rubric.engine !== 'conditional-foundations.v1')
      throw Error('A conditional-formatting rubric is required.');
    const lesson = resolveLesson({ id: exercise?.lesson?.id, version: exercise?.lesson?.version });
    const runtime = conditionalRuntime(rubric.runtime);
    if (lesson.rubric.id !== rubric.id || lesson.rubric.version !== rubric.version ||
        !runtime.lessons.some(ref => ref.id === lesson.id && ref.version === lesson.version) ||
        !runtime.capabilities.includes(lesson.capability_id) ||
        !['guided','independent'].includes(exercise.mode))
      throw Error('Conditional lesson and rubric do not match.');
    const { inputCells, goal } = lesson.worksheet;
    const baseline = exercise.values;
    if (!plain(baseline) || Object.keys(baseline).sort().join() !== inputCells.slice().sort().join())
      throw Error('Conditional exercise inputs do not match the lesson.');
    inputCells.forEach(address => syntax.numericCell(baseline[address]));
    const target = validateConditionalRule(rubric.runtime, { ...goal, threshold: exercise.threshold });
    const active = rule === null ? null : validateConditionalRule(rubric.runtime, rule);
    const view = conditionalView(rubric.runtime, active, cells);
    const expected = conditionalView(rubric.runtime, target, cells);
    const criteria = [
      { id:'rule-range', label:'Rule applies to the entire B2:B4 range', passed:active?.range === target.range },
      { id:'rule-operator', label:'Rule uses strictly less than', passed:active?.operator === target.operator },
      { id:'rule-threshold', label:'Rule uses the requested numeric threshold', passed:active?.threshold === target.threshold },
      { id:'rule-style', label:'Rule uses light red fill and dark red text', passed:active?.style === target.style },
      { id:'matched-cells', label:'Actual highlighted cells match the goal, with all inputs valid',
        passed:active !== null && view.invalid.length === 0 &&
          view.highlighted.join(',') === expected.highlighted.join(',') },
    ];
    if (exercise.mode === 'independent') criteria.push({ id:'original-inputs',
      label:'Original exercise inputs preserved',
      passed:inputCells.every(address => Object.hasOwn(cells,address) && numberMatches(cells[address],baseline[address])) });
    return { ...result(criteria), view };
  }

  // F4C: exact, case-insensitive text-code lookups over a three-row catalog.
  // No arbitrary expressions, wildcards, approximate matches or formula chains.
  const lookupGap='(?: |\\r\\n)*';
  const lookupRef='\\$?[AE]\\$?[234]';
  const lookupCell='\\$?[ABC]\\$?[234]';
  const lookupRange='('+lookupCell+':'+lookupCell+')';
  const lookupPrefix='^'+lookupGap+'='+lookupGap;
  const lookupEnd=lookupGap+'\\)'+lookupGap+'$';
  const lookupComma=lookupGap+','+lookupGap;
  const lookupX=new RegExp(lookupPrefix+'XLOOKUP\\('+lookupGap+'('+lookupRef+')'+lookupComma+
    lookupRange+lookupComma+lookupRange+'(?:'+lookupComma+','+lookupGap+'0)?'+lookupEnd,'i');
  const lookupV=new RegExp(lookupPrefix+'VLOOKUP\\('+lookupGap+'('+lookupRef+')'+lookupComma+
    lookupRange+lookupComma+'([123])'+lookupComma+'(?:FALSE|0)'+lookupEnd,'i');
  const lookupInputs=['A2','B2','C2','A3','B3','C3','A4','B4','C4','E2'];
  function lookupRuntime(ref){
    const runtime=resolveRuntime(ref);
    if(runtime.engine!=='bounded-lookup.v1')throw Error('A lookup practice runtime is required.');
    return runtime;
  }
  const lookupAddress=s=>s.replaceAll('$','').toUpperCase();
  function lookupRectangle(range){
    const [first,last]=range.split(':').map(lookupAddress);
    const left=first.charCodeAt(0),right=last.charCodeAt(0),start=Number(first[1]),end=Number(last[1]);
    if(left>right||start>end)throw Error('Use an ordered catalog range.');
    return {left,right,start,end};
  }
  const lookupColumn=(col,start,end)=>String.fromCharCode(col)+start+':'+String.fromCharCode(col)+end;
  function parseLookupFormula(runtimeRef,formula){
    lookupRuntime(runtimeRef);
    if(typeof formula!=='string'||formula.length>160)throw Error('Enter a supported lookup formula, up to 160 characters.');
    const x=lookupX.exec(formula),v=lookupV.exec(formula);
    const match=x||v;
    if(!match||match[0].length!==formula.length)
      throw Error('Use XLOOKUP with exact matching or VLOOKUP with FALSE/0. Keep references and tokens together.');
    const key=lookupAddress(match[1]);
    if(!['E2','A2','A3','A4'].includes(key))throw Error('Use a supported code cell.');
    const search=lookupRectangle(match[2]);
    let returns,fn;
    if(x){
      returns=lookupRectangle(match[3]);fn='XLOOKUP';
      if(search.left!==65||search.right!==65||returns.left!==returns.right||
          search.end-search.start!==returns.end-returns.start)
        throw Error('Choose an A-column search range and an equally long one-column return range.');
    }else{
      fn='VLOOKUP';
      const index=Number(match[3]),col=search.left+index-1;
      if(search.left!==65||col>search.right)throw Error('The table must start in column A and contain the requested column.');
      returns={left:col,right:col,start:search.start,end:search.end};
    }
    return {fn,key,search:lookupColumn(65,search.start,search.end),
      returns:lookupColumn(returns.left,returns.start,returns.end)};
  }
  function lookupCode(value){
    if(typeof value!=='string'||! /^[A-Za-z][A-Za-z0-9_-]{0,23}$/.test(value)||
        /[\r\n]/.test(value))throw Error('Use a code of 1–24 ASCII characters, starting with a letter; letters, digits, hyphens and underscores only.');
    return value.toUpperCase();
  }
  function lookupLabel(value){
    if(typeof value!=='string'||!value.trim()||value.length>80||/[\x00-\x1f\x7f]/.test(value))
      throw Error('Use a nonempty item label of at most 80 characters.');
    return value;
  }
  function lookupValue(cells,address){
    if(!Object.hasOwn(cells,address))throw Error('Missing input '+address+'.');
    const value=cells[address];
    return address[0]==='C'?syntax.numericCell(value):address[0]==='B'?lookupLabel(value):lookupCode(value);
  }
  function evaluateLookupFormula(runtimeRef,formula,cells){
    const parsed=parseLookupFormula(runtimeRef,formula);
    if(!plain(cells))throw Error('Worksheet inputs are required.');
    const key=lookupValue(cells,parsed.key),s=lookupRectangle(parsed.search),r=lookupRectangle(parsed.returns);
    // Validate the entire searched range before returning any match.
    const keys=[];
    for(let row=s.start;row<=s.end;row++)keys.push(lookupValue(cells,'A'+row));
    const index=keys.indexOf(key);
    if(index===-1)return {result:null,error:'#N/A',matchedCell:null};
    const address=String.fromCharCode(r.left)+(r.start+index);
    // Return the original spelling for a text code, not the comparison key.
    let resultValue=lookupValue(cells,address);
    if(address[0]==='A')resultValue=cells[address];
    return {result:resultValue,error:null,matchedCell:address};
  }
  function gradeLookup(rubricRef,exercise,formula,cells){
    const rubric=resolveRubric(rubricRef);
    if(rubric.engine!=='lookup-foundations.v1')throw Error('A lookup rubric is required.');
    const lesson=resolveLesson({id:exercise?.lesson?.id,version:exercise?.lesson?.version});
    const runtime=lookupRuntime(rubric.runtime);
    if(lesson.rubric.id!==rubric.id||lesson.rubric.version!==rubric.version||
        !runtime.lessons.some(ref=>ref.id===lesson.id&&ref.version===lesson.version)||
        !runtime.capabilities.includes(lesson.capability_id)||
        !['guided','independent'].includes(exercise.mode))
      throw Error('Lookup lesson and rubric do not match.');
    const baseline=exercise.values;
    if(!plain(baseline)||Object.keys(baseline).sort().join()!==lookupInputs.slice().sort().join())
      throw Error('Lookup exercise inputs do not match the lesson.');
    lookupInputs.forEach(address=>lookupValue(baseline,address));
    let parsed=null,evaluated={result:null,error:'Enter a supported lookup formula.',matchedCell:null},expected=null;
    try{parsed=parseLookupFormula(rubric.runtime,formula);}catch{}
    try{evaluated=evaluateLookupFormula(rubric.runtime,formula,cells);}
    catch(error){evaluated={result:null,error:error.message,matchedCell:null};}
    try{expected=evaluateLookupFormula(rubric.runtime,lesson.worksheet.formula,cells);}catch{}
    const criteria=[
      {id:'lookup-function',label:'Use the requested '+lesson.fn+' function',passed:parsed?.fn===lesson.fn},
      {id:'lookup-key',label:'Look up the code in E2',passed:parsed?.key===lesson.worksheet.query},
      {id:'search-range',label:'Search the complete code range A2:A4',passed:parsed?.search===lesson.worksheet.search},
      {id:'return-range',label:'Return the corresponding amount from C2:C4',passed:parsed?.returns===lesson.worksheet.returns},
      {id:'lookup-result',label:'Retrieve the correct numeric amount for the current code',
        passed:expected?.error===null&&evaluated.error===null&&typeof evaluated.result==='number'&&evaluated.result===expected.result},
    ];
    if(exercise.mode==='independent')criteria.push({id:'original-inputs',label:'Original catalog and lookup code preserved',
      passed:plain(cells)&&lookupInputs.every(address=>Object.hasOwn(cells,address)&&
        (address[0]==='C'?numberMatches(cells[address],baseline[address]):cells[address]===baseline[address]))});
    return {...result(criteria),evaluated};
  }

  // F5A: exact text criteria and aligned ranges, not a general Excel interpreter.
  const summaryGap='(?: |\\r\\n)*';
  const summaryOuter=new RegExp('^'+summaryGap+'='+summaryGap+'(SUMIF|SUMIFS|COUNTIF)\\('+summaryGap+'([^()]*)\\)'+summaryGap+'$','i');
  const summaryRangePattern=new RegExp('^'+summaryGap+'(\\$?[BCD]\\$?[2-7])'+summaryGap+':'+summaryGap+'(\\$?[BCD]\\$?[2-7])'+summaryGap+'$','i');
  const summaryCriterionPattern=new RegExp('^'+summaryGap+'(?:(\\$?F\\$?[23])|"([A-Za-z][A-Za-z0-9 _-]{0,31})")'+summaryGap+'$','i');
  const summaryInputCells=[2,3,4,5,6,7].flatMap(row=>['A'+row,'B'+row,'C'+row,'D'+row]).concat(['F2','F3']);
  function summaryRuntime(ref){
    const runtime=resolveRuntime(ref);
    if(runtime.engine!=='bounded-conditional-summary.v1')throw Error('A conditional-summary runtime is required.');
    return runtime;
  }
  const summaryAddress=value=>value.replaceAll('$','').toUpperCase();
  function summaryRange(value,columns){
    const match=summaryRangePattern.exec(value);
    if(!match||match[0].length!==value.length)throw Error('Use a contiguous range within B2:D7.');
    const first=summaryAddress(match[1]),last=summaryAddress(match[2]);
    if(first[0]!==last[0]||!columns.includes(first[0])||Number(first[1])>Number(last[1]))
      throw Error('Use an ordered single-column range in the supported columns.');
    return first+':'+last;
  }
  function summaryCriterion(value){
    const match=summaryCriterionPattern.exec(value);
    if(!match||match[0].length!==value.length)throw Error('Use F2/F3 or an exact quoted text criterion.');
    return match[1]?{kind:'cell',value:summaryAddress(match[1])}:{kind:'text',value:match[2]};
  }
  const summaryAddresses=range=>{
    const [first,last]=range.split(':');
    return Array.from({length:Number(last[1])-Number(first[1])+1},(_,i)=>first[0]+(Number(first[1])+i));
  };
  function parseSummaryFormula(runtimeRef,formula){
    summaryRuntime(runtimeRef);
    if(typeof formula!=='string'||formula.length>200)throw Error('Enter a supported summary formula of at most 200 characters.');
    const match=summaryOuter.exec(formula);
    if(!match||match[0].length!==formula.length)throw Error('Use SUMIF, SUMIFS or COUNTIF with contiguous function and cell tokens.');
    const fn=match[1].toUpperCase(),args=match[2].split(',');
    if(args.length!==({SUMIF:3,SUMIFS:5,COUNTIF:2})[fn])throw Error('Check the number and order of formula arguments.');
    const pair=(range,criterion)=>({range:summaryRange(range,['B','C']),criterion:summaryCriterion(criterion)});
    let pairs,sumRange=null;
    if(fn==='SUMIFS'){
      sumRange=summaryRange(args[0],['D']);pairs=[pair(args[1],args[2]),pair(args[3],args[4])];
    }else{
      pairs=[pair(args[0],args[1])];
      if(fn==='SUMIF')sumRange=summaryRange(args[2],['D']);
    }
    const ranges=[...pairs.map(p=>p.range),...(sumRange?[sumRange]:[])],length=summaryAddresses(ranges[0]).length;
    if(ranges.some(r=>summaryAddresses(r).length!==length))throw Error('Every range must have the same number of rows in this practice.');
    return {fn,pairs,sumRange};
  }
  function summaryText(value){
    if(typeof value!=='string'||! /^[A-Za-z][A-Za-z0-9 _-]{0,31}$/.test(value)||/[\r\n]/.test(value))
      throw Error('Use nonempty exact text of 1–32 supported ASCII characters; no wildcards or comparison operators.');
    return value.toUpperCase();
  }
  function summaryLabel(value){
    if(typeof value!=='string'||!value.trim()||value.length>80||/[\x00-\x1f\x7f]/.test(value))
      throw Error('Use a nonempty record label of at most 80 characters.');
    return value;
  }
  function summaryValue(cells,address){
    if(!Object.hasOwn(cells,address))throw Error('Missing input '+address+'.');
    const value=cells[address];
    return address[0]==='D'?syntax.numericCell(value):address[0]==='A'?summaryLabel(value):summaryText(value);
  }
  function evaluateSummaryFormula(runtimeRef,formula,cells){
    const parsed=parseSummaryFormula(runtimeRef,formula);
    if(!plain(cells))throw Error('Worksheet inputs are required.');
    const pairs=parsed.pairs.map(p=>({addresses:summaryAddresses(p.range),
      expected:p.criterion.kind==='cell'?summaryValue(cells,p.criterion.value):summaryText(p.criterion.value)}));
    const compared=pairs.map(p=>p.addresses.map(address=>summaryValue(cells,address)===p.expected));
    const amountAddresses=parsed.sumRange?summaryAddresses(parsed.sumRange):null;
    const amounts=amountAddresses?amountAddresses.map(address=>summaryValue(cells,address)):null;
    let total=0;
    const matched=[];
    for(let i=0;i<compared[0].length;i++){
      if(!compared.every(values=>values[i]))continue;
      // Preserve positional pairing even when a learner shifts a range.
      matched.push({criteria:pairs.map(p=>p.addresses[i]),amount:amountAddresses?amountAddresses[i]:null});
      total+=amounts?amounts[i]:1;
    }
    return {result:Number(total.toPrecision(15)),error:null,matched};
  }
  function gradeSummary(rubricRef,exercise,formula,cells){
    const rubric=resolveRubric(rubricRef);
    if(rubric.engine!=='conditional-summary-foundations.v1')throw Error('A conditional-summary rubric is required.');
    const lesson=resolveLesson({id:exercise?.lesson?.id,version:exercise?.lesson?.version});
    const runtime=summaryRuntime(rubric.runtime);
    if(lesson.rubric.id!==rubric.id||lesson.rubric.version!==rubric.version||
        !runtime.lessons.some(ref=>ref.id===lesson.id&&ref.version===lesson.version)||
        !runtime.capabilities.includes(lesson.capability_id)||
        !['guided','independent'].includes(exercise.mode))
      throw Error('Summary lesson and rubric do not match.');
    const baseline=exercise.values;
    if(!plain(baseline)||Object.keys(baseline).sort().join()!==summaryInputCells.slice().sort().join())
      throw Error('Summary exercise inputs do not match the lesson.');
    summaryInputCells.forEach(address=>summaryValue(baseline,address));
    const goal=lesson.worksheet;
    let parsed=null,evaluated={result:null,error:'Enter a supported summary formula.',matched:[]},expected=null;
    try{parsed=parseSummaryFormula(rubric.runtime,formula);}catch{}
    try{evaluated=evaluateSummaryFormula(rubric.runtime,formula,cells);}
    catch(error){evaluated={result:null,error:error.message,matched:[]};}
    try{expected=evaluateSummaryFormula(rubric.runtime,goal.formula,cells);}catch{}
    const actualPairs=parsed?.pairs??[];
    const columnsMatch=actualPairs.length===goal.pairs.length&&goal.pairs.every(p=>actualPairs.some(a=>a.range===p.range));
    const referencesMatch=actualPairs.length===goal.pairs.length&&goal.pairs.every(p=>
      actualPairs.some(a=>a.range[0]===p.range[0]&&a.criterion.kind==='cell'&&a.criterion.value===p.criterion));
    const criteria=[
      {id:'summary-function',label:'Use the requested '+lesson.fn+' function',passed:parsed?.fn===lesson.fn},
      {id:'criteria-ranges',label:'Use the complete required criteria ranges',passed:columnsMatch},
      {id:'criteria-references',label:'Use the requested criterion cells with the corresponding columns',passed:referencesMatch},
    ];
    if(goal.sumRange)criteria.push({id:'sum-range',label:'Sum the complete aligned amount range D2:D7',passed:parsed?.sumRange===goal.sumRange});
    criteria.push({id:'summary-result',label:'Calculate the correct numeric summary for current inputs',
      passed:expected?.error===null&&evaluated.error===null&&evaluated.result===expected.result});
    if(exercise.mode==='independent')criteria.push({id:'original-inputs',label:'Original records and criteria preserved',
      passed:plain(cells)&&summaryInputCells.every(address=>Object.hasOwn(cells,address)&&
        (address[0]==='D'?numberMatches(cells[address],baseline[address]):cells[address]===baseline[address]))});
    return {...result(criteria),evaluated};
  }

  // F3 keeps typed records separate from order, formatting and hidden rows.
  // Every operation is pure, and rules never rewrite already-entered values.
  function tableRuntime(ref) {
    const runtime = resolveRuntime(ref);
    if (runtime.engine !== 'bounded-business-table.v1')
      throw Error('A business-table practice runtime is required.');
    return runtime;
  }
  const hasKeys = (value, keys) => plain(value) &&
    Object.keys(value).sort().join() === keys.slice().sort().join();
  const packedList = (value, max) => Array.isArray(value) && value.length <= max &&
    Object.keys(value).length === value.length &&
    Array.from({ length: value.length }, (_, index) => Object.hasOwn(value, index)).every(Boolean);
  const tableNumber = value => value === null ||
    (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e12);
  const tableDate = value => value === null ||
    (Number.isSafeInteger(value) && value >= 61 && value <= 2958465);
  const shortText = (value, max) => typeof value === 'string' && value.length <= max;
  function tableId(value) {
    if (!shortText(value, 24)) return false;
    const match = /^[A-Za-z0-9][A-Za-z0-9_-]*$/.exec(value);
    return !!match && match[0].length === value.length;
  }
  function tableRows(runtime, rows) {
    if (!packedList(rows, runtime.row_count) || rows.length !== runtime.row_count ||
        rows.some(row => !hasKeys(row, tableColumns) ||
          !tableId(row.id) ||
          !shortText(row.item, 80) || !row.item.trim() || !shortText(row.status, 32) ||
          !['quantity', 'unitPrice', 'discount'].every(column => tableNumber(row[column])) ||
          !tableDate(row.shipDate)) || new Set(rows.map(row => row.id)).size !== runtime.row_count)
      throw Error('Use six complete records with unique SKU IDs and bounded typed values.');
    return rows;
  }
  function tableName(runtime, value) {
    // Released v1 keeps its 31-character policy; v2 explicitly opts into 32.
    if (typeof value !== 'string' || value.length > (runtime.table_name_max_length ?? 31)) return false;
    const match = /^[A-Za-z_][A-Za-z0-9_]{0,31}$/.exec(value);
    return !!match && match[0].length === value.length &&
      !/^(?:[A-Za-z]{1,3}[1-9][0-9]*|[RC]|R[1-9][0-9]*C[1-9][0-9]*)$/i.test(value);
  }
  function tableFilter(value) {
    return hasKeys(value, ['status', 'minimumQuantity']) &&
      (value.status === null || shortText(value.status, 32)) &&
      (value.minimumQuantity === null || (typeof value.minimumQuantity === 'number' &&
        Number.isFinite(value.minimumQuantity) && Math.abs(value.minimumQuantity) <= 1e12));
  }
  function validateTableState(runtime, state) {
    if (!hasKeys(state, ['schema_version', 'rows', 'order', 'formats', 'table', 'sort',
      'filters', 'filterVisibleIds', 'validation']) || state.schema_version !== 1)
      throw Error('Unsupported table worksheet state.');
    tableRows(runtime, state.rows);
    const ids = state.rows.map(row => row.id);
    if (!packedList(state.order, ids.length) || state.order.length !== ids.length ||
        new Set(state.order).size !== ids.length ||
        !state.order.every(id => ids.includes(id))) throw Error('Keep every SKU exactly once in the row order.');
    if (!hasKeys(state.formats, tableNumberColumns) ||
        !tableNumberColumns.every(column => tableFormats.includes(state.formats[column])))
      throw Error('Unsupported column format.');
    if (state.table !== null && (!hasKeys(state.table, ['name', 'range', 'headers', 'banded']) ||
        !tableName(runtime, state.table.name) || state.table.range !== 'A1:G7' ||
        state.table.headers !== true || typeof state.table.banded !== 'boolean'))
      throw Error('Create a named table over A1:G7 with the existing headers.');
    if (state.sort !== null && (!hasKeys(state.sort, ['column', 'direction']) ||
        !tableColumns.includes(state.sort.column) || !['asc', 'desc'].includes(state.sort.direction) || !state.table))
      throw Error('Unsupported table sort.');
    if (!tableFilter(state.filters)) throw Error('Unsupported table filter.');
    if (state.filterVisibleIds !== null && (!packedList(state.filterVisibleIds, ids.length) ||
        new Set(state.filterVisibleIds).size !== state.filterVisibleIds.length ||
        !state.filterVisibleIds.every(id => ids.includes(id)) || !state.table))
      throw Error('Unsupported filtered-row selection.');
    if (state.filterVisibleIds === null &&
        (state.filters.status !== null || state.filters.minimumQuantity !== null))
      throw Error('Apply the filter to establish its visible rows.');
    if (!hasKeys(state.validation, ['quantity', 'status']) ||
        typeof state.validation.quantity !== 'boolean' || typeof state.validation.status !== 'boolean')
      throw Error('Unsupported validation rules.');
    return state;
  }
  function copyTableState(state) {
    return { schema_version: 1, rows: state.rows.map(row => ({ ...row })), order: [...state.order],
      formats: { ...state.formats }, table: state.table && { ...state.table },
      sort: state.sort && { ...state.sort }, filters: { ...state.filters },
      filterVisibleIds: state.filterVisibleIds && [...state.filterVisibleIds],
      validation: { ...state.validation } };
  }
  function createTableState(runtimeRef, rows) {
    const runtime = tableRuntime(runtimeRef);
    tableRows(runtime, rows);
    return { schema_version: 1, rows: rows.map(row => ({ ...row })), order: rows.map(row => row.id),
      formats: Object.fromEntries(tableNumberColumns.map(column => [column, 'general'])),
      table: null, sort: null, filters: { status: null, minimumQuantity: null },
      filterVisibleIds: null, validation: { quantity: false, status: false } };
  }
  function quantityAllowed(value) {
    return Number.isSafeInteger(value) && value >= 0 && value <= 10000;
  }
  function filterMatches(row, filter) {
    return (filter.status === null || row.status === filter.status) &&
      (filter.minimumQuantity === null || (row.quantity !== null && row.quantity >= filter.minimumQuantity));
  }
  function compareTableValues(a, b, direction) {
    // A blank remains at the end in either direction; ties keep their prior order.
    const blankA = a === null || a === '', blankB = b === null || b === '';
    if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1;
    const left = typeof a === 'string' ? a.toUpperCase() : a;
    const right = typeof b === 'string' ? b.toUpperCase() : b;
    return (left < right ? -1 : left > right ? 1 : 0) * (direction === 'asc' ? 1 : -1);
  }
  function applyTableAction(runtimeRef, state, action) {
    const runtime = tableRuntime(runtimeRef);
    validateTableState(runtime, state);
    if (!plain(action) || typeof action.type !== 'string') throw Error('Choose a supported table action.');
    const next = copyTableState(state);
    if (action.type === 'set-format') {
      if (!hasKeys(action, ['type', 'column', 'format']) || !tableNumberColumns.includes(action.column) ||
          !tableFormats.includes(action.format)) throw Error('Choose a numeric column and supported number format.');
      next.formats[action.column] = action.format;
    } else if (action.type === 'create-table') {
      if (!hasKeys(action, ['type', 'name', 'range', 'headers', 'banded']) || !tableName(runtime, action.name))
        throw Error(runtime.version === 1
          ? 'Use a table name beginning with a letter or underscore, without spaces or cell references.'
          : 'Use a table name with 1–32 characters: start with A–Z, a–z or _, then use only those letters, digits or _. Spaces, cell-reference names and the single letters R or C are not supported in this practice.');
      if (action.range !== 'A1:G7' || action.headers !== true || typeof action.banded !== 'boolean')
        throw Error('This practice table must include A1:G7 and its existing header row.');
      next.table = { name: action.name, range: action.range, headers: action.headers, banded: action.banded };
    } else if (action.type === 'sort') {
      if (!hasKeys(action, ['type', 'column', 'direction']) || !tableColumns.includes(action.column) ||
          !['asc', 'desc'].includes(action.direction) || !next.table)
        throw Error('Create the table, then choose a column and sort direction.');
      const byId = new Map(next.rows.map(row => [row.id, row]));
      next.order = next.order.map((id, index) => ({ id, index })).sort((a, b) =>
        compareTableValues(byId.get(a.id)[action.column], byId.get(b.id)[action.column], action.direction) ||
        a.index - b.index).map(row => row.id);
      next.sort = { column: action.column, direction: action.direction };
    } else if (action.type === 'filter') {
      const filter = { status: action.status, minimumQuantity: action.minimumQuantity };
      if (!hasKeys(action, ['type', 'status', 'minimumQuantity']) || !tableFilter(filter) || !next.table)
        throw Error('Create the table, then choose a status and numeric minimum quantity.');
      next.filters = filter;
      next.filterVisibleIds = next.rows.filter(row => filterMatches(row, filter)).map(row => row.id);
    } else if (action.type === 'clear-filter') {
      if (!hasKeys(action, ['type'])) throw Error('Unsupported clear-filter action.');
      next.filters = { status: null, minimumQuantity: null }; next.filterVisibleIds = null;
    } else if (action.type === 'set-validation') {
      if (!hasKeys(action, ['type', 'column', 'enabled']) || !['quantity', 'status'].includes(action.column) ||
          typeof action.enabled !== 'boolean') throw Error('Choose the quantity or status validation rule.');
      next.validation[action.column] = action.enabled;
    } else if (action.type === 'edit-cell') {
      if (!hasKeys(action, ['type', 'rowId', 'column', 'value']) || !['quantity', 'status'].includes(action.column) ||
          typeof action.value !== 'string') throw Error('Edit a quantity or status using its SKU.');
      const row = next.rows.find(item => item.id === action.rowId);
      if (!row) throw Error('Choose an existing SKU.');
      let value;
      if (action.column === 'quantity') {
        value = syntax.numericCell(action.value, { allowBlank: true });
        if (next.validation.quantity && !quantityAllowed(value))
          throw Error('Quantity must be a whole number from 0 to 10000; blanks are not allowed.');
      } else {
        value = action.value;
        if (!shortText(value, 32)) throw Error('Use a status of at most 32 characters.');
        if (next.validation.status && !tableStatuses.includes(value))
          throw Error('Use the exact status Ready, Reserved or Shipped; blanks are not allowed.');
      }
      row[action.column] = value;
    } else throw Error('Unsupported table action.');
    validateTableState(runtime, next);
    return next;
  }
  function tableView(runtimeRef, state) {
    validateTableState(tableRuntime(runtimeRef), state);
    const byId = new Map(state.rows.map(row => [row.id, row]));
    return state.order.filter(id => state.filterVisibleIds === null || state.filterVisibleIds.includes(id))
      .map(id => ({ ...byId.get(id) }));
  }
  function inspectTableValidation(runtimeRef, state) {
    validateTableState(tableRuntime(runtimeRef), state);
    return state.rows.flatMap(row => [
      ...(state.validation.quantity && !quantityAllowed(row.quantity)
        ? [{ rowId: row.id, column: 'quantity', message: 'Use a whole quantity from 0 to 10000.' }] : []),
      ...(state.validation.status && !tableStatuses.includes(row.status)
        ? [{ rowId: row.id, column: 'status', message: 'Use the exact status Ready, Reserved or Shipped.' }] : []),
    ]);
  }
  function formatTableValue(runtimeRef, column, value, format) {
    tableRuntime(runtimeRef);
    if (!tableColumns.includes(column) || !tableFormats.includes(format)) throw Error('Unsupported column format.');
    if (!tableNumberColumns.includes(column)) {
      if (format !== 'general' || !shortText(value, column === 'item' ? 80 : 32))
        throw Error('Text fields use their original text.');
      return value;
    }
    if (!tableNumber(value) || (column === 'shipDate' && !tableDate(value)))
      throw Error('Use a bounded numeric value for this column.');
    if (value === null) return '';
    const number = digits => new Intl.NumberFormat('en-US', {
      minimumFractionDigits: digits, maximumFractionDigits: digits,
    }).format(value);
    if (format === 'general') return String(value);
    if (format === 'integer') return number(0);
    if (format === 'decimal') return number(2);
    if (format === 'jpy') return 'JPY ' + number(0);
    if (format === 'php') return 'PHP ' + number(2);
    if (format === 'percent') return new Intl.NumberFormat('en-US', {
      style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1,
    }).format(value);
    if (!tableDate(value)) return 'Date outside this practice';
    return new Date(Date.UTC(1899, 11, 30) + value * 86400000).toISOString().slice(0, 10);
  }
  function gradeTables(rubricRef, exercise, state) {
    const rubric = resolveRubric(rubricRef);
    if (!['table-foundations.v1', 'table-foundations.v2'].includes(rubric.engine))
      throw Error('A business-table rubric is required.');
    const runtime = tableRuntime(rubric.runtime);
    const lesson = resolveLesson({ id: exercise?.lesson?.id, version: exercise?.lesson?.version });
    if (lesson.rubric.id !== rubric.id || lesson.rubric.version !== rubric.version ||
        !runtime.lessons.some(ref => ref.id === lesson.id && ref.version === lesson.version) ||
        !runtime.capabilities.includes(lesson.capability_id) || !['guided', 'independent'].includes(exercise.mode) ||
        !['JPY', 'PHP'].includes(exercise.currency)) throw Error('Table lesson, currency and rubric must match.');
    tableRows(runtime, exercise.rows); validateTableState(runtime, state);
    const byId = new Map(state.rows.map(row => [row.id, row]));
    const sameIds = exercise.rows.every(row => byId.has(row.id));
    const original = sameIds && exercise.rows.every(row =>
      tableColumns.every(column => row[column] === byId.get(row.id)[column]));
    const criteria = [], add = (id, label, passed) => criteria.push({ id, label, passed: !!passed });
    if (lesson.id === 'number-formats') {
      for (const [column, expected] of Object.entries(lesson.goal.formats))
        add('format:' + column, column + ' uses the requested display format',
          state.formats[column] === (expected === 'scenario-currency' ? exercise.currency.toLowerCase() : expected));
    } else if (lesson.id === 'create-table') {
      add('table-created', 'All six records belong to a table with the existing headers', !!state.table);
      add('table-name', 'The table is named PracticeItems',
        rubric.engine === 'table-foundations.v1' ? state.table?.name === lesson.goal.table.name
          : state.table?.name.toLowerCase() === lesson.goal.table.name.toLowerCase());
      add('table-banding', 'Banded table rows are enabled', state.table?.banded === true);
    } else if (lesson.id === 'sort-records') {
      add('sort-setting', 'Quantity is selected for a smallest-to-largest sort',
        state.sort?.column === lesson.goal.sort.column && state.sort?.direction === lesson.goal.sort.direction);
      const current = state.order.map(id => byId.get(id));
      add('numeric-row-order', 'Complete records are in numeric quantity order',
        current.every((row, i) => !i || compareTableValues(current[i - 1].quantity, row.quantity, 'asc') <= 0));
      add('all-records-visible', 'All six records remain visible', tableView(rubric.runtime, state).length === 6);
    } else if (lesson.id === 'filter-records') {
      add('filter-status', 'The status filter selects Ready', state.filters.status === lesson.goal.filters.status);
      add('filter-quantity', 'The quantity filter requires at least 5',
        state.filters.minimumQuantity === lesson.goal.filters.minimumQuantity);
      const expected = state.rows.filter(row => filterMatches(row, lesson.goal.filters)).map(row => row.id).sort();
      const visible = tableView(rubric.runtime, state).map(row => row.id).sort();
      add('matching-records-visible', 'Only records matching both conditions are visible',
        expected.length === visible.length && expected.every((id, i) => id === visible[i]));
    } else if (lesson.id === 'validate-entry') {
      add('validation:quantity', 'Quantity requires a whole number from 0 to 10000', state.validation.quantity);
      add('validation:status', 'Status requires Ready, Reserved or Shipped', state.validation.status);
      add('valid-quantities', 'All existing quantities satisfy the requested rule', state.rows.every(row => quantityAllowed(row.quantity)));
      add('valid-statuses', 'All existing statuses satisfy the requested list', state.rows.every(row => tableStatuses.includes(row.status)));
    }
    add('record-identities', 'All six original SKU records are retained', sameIds);
    if (exercise.mode === 'independent') add('original-records', 'Every original value stays with its SKU', original);
    return result(criteria);
  }
  function formulaMatches(actual, expected) {
    const a = syntax.parse(actual), b = syntax.parse(expected);
    return !!a && !!b && a.canonical === b.canonical;
  }
  function numberMatches(actual, expected) {
    try { return syntax.numericCell(actual) === Number(expected); }
    catch { return false; }
  }
  function sameInputs(actual, expected, policy) {
    try { numeric(actual, policy); numeric(expected, policy); }
    catch { return false; }
    return actual.every((value, index) => value.trim() === ''
      ? expected[index].trim() === ''
      : expected[index].trim() !== '' && numberMatches(value, expected[index]));
  }
  function bounded(value, limit) {
    if (typeof value === 'boolean' || value === null) return value;
    return typeof value === 'string' ? value.slice(0, limit) : null;
  }
  function checkWorksheetCriterion(criterion, state, limit, depth = 0) {
    if (!criterion || typeof criterion !== 'object' || depth > 8)
      throw Error('Unsupported worksheet criterion.');
    if (criterion.all) {
      if (!Array.isArray(criterion.all) || !criterion.all.length || criterion.all.length > 32)
        throw Error('Unsupported grouped criterion.');
      const children = criterion.all.map(child => checkWorksheetCriterion(child, state, limit, depth + 1));
      return { passed: children.every(child => child.passed), response: children.map(child => child.response) };
    }
    const actual = bounded(criterion.cell
      ? state.cells?.[criterion.cell]?.[criterion.property] : state[criterion.property], limit);
    let passed;
    if (criterion.property === 'formula') passed = formulaMatches(actual, criterion.expected);
    else if (typeof criterion.expected === 'boolean') passed = actual === criterion.expected;
    else if (typeof criterion.expected === 'string' && /^-?\d+(?:\.\d+)?$/.test(criterion.expected))
      passed = numberMatches(actual, criterion.expected);
    else passed = actual === criterion.expected;
    return { passed, response: { cell: criterion.cell ?? null, property: criterion.property, value: actual } };
  }
  function checkCriterion(rubricRef, criterion, state) {
    const rubric = resolveRubric(rubricRef);
    if (rubric.engine !== 'worksheet-criteria.v1') throw Error('A worksheet criterion rubric is required.');
    return checkWorksheetCriterion(criterion, state, rubric.response_limit);
  }
  function result(criteria) {
    const score = criteria.filter(item => item.passed).length;
    return { score, maxScore: criteria.length, passed: score === criteria.length, criteria };
  }
  function gradeFormula(rubricRef, exercise, formula, values) {
    const rubric = resolveRubric(rubricRef);
    if (rubric.engine !== 'formula-foundations.v1') throw Error('A formula lesson rubric is required.');
    const lesson = resolveLesson({ id: exercise?.lesson?.id, version: exercise?.lesson?.version });
    if (lesson.rubric.id !== rubric.id || lesson.rubric.version !== rubric.version ||
        !['guided', 'independent'].includes(exercise.mode))
      throw Error('Formula lesson and rubric do not match.');
    const runtime = resolveRuntime(rubric.runtime);
    if (!runtime.lessons.some(ref => ref.id === lesson.id && ref.version === lesson.version) ||
        !runtime.capabilities.includes(lesson.capability_id))
      throw Error('Formula lesson is not supported by this runtime version.');
    let evaluated = null;
    try { evaluated = evaluateFormula(rubric.runtime, formula, values); } catch {}
    const criteria = [
      { label: 'Correct function and B2:B4 range', passed: formulaMatches(formula, lesson.worksheet.formula) },
      { label: 'Valid calculation for the entered formula', passed: !!evaluated && !evaluated.error },
    ];
    if (exercise.mode === 'independent')
      criteria.push({ label: 'Original exercise inputs preserved', passed: sameInputs(values, exercise.values, runtime.input_policy) });
    return { ...result(criteria), evaluated };
  }
  function assignedBaseline(rows) {
    if (!Array.isArray(rows) || rows.length !== 3 ||
        Object.keys(rows).length !== 3 || ![0, 1, 2].every(i => Object.hasOwn(rows, i)) ||
        rows.some(row => !Array.isArray(row) || typeof row[1] !== 'number' ||
          !Number.isFinite(row[1]) || Math.abs(row[1]) > 1e12))
      throw Error('Unsupported assigned SUM dataset.');
    return rows.map(row => String(row[1]));
  }
  function toolEvidence(state) {
    const keys = ['bold', 'fill', 'border', 'copy_used'];
    if (!state || Object.getPrototypeOf(state) !== Object.prototype ||
        Object.keys(state).length !== keys.length ||
        !keys.every(key => Object.hasOwn(state, key) && typeof state[key] === 'boolean'))
      throw Error('Invalid saved worksheet tools.');
    return state;
  }
  function gradeAssigned(rubricRef, activity, rows, values, formula, toolState) {
    const rubric = resolveRubric(rubricRef);
    if (rubric.engine !== 'assigned-practice.v1' || !rubric.activities.includes(activity))
      throw Error('Unsupported assigned practice rubric or activity.');
    const runtime = resolveRuntime(rubric.runtime);
    const sum = runtime.capabilities.map(resolveCapability).find(item => item.kind === 'formula');
    const original = assignedBaseline(rows), target = [...original];
    const inputs = Array.isArray(values) && values.length === 3 &&
      Object.keys(values).length === 3 && [0, 1, 2].every(i => Object.hasOwn(values, i)) ? values : [];
    if (activity === 'independent-match-v1' || activity === 'independent-copy-v1')
      target[1] = original[0];
    const labels = ['B2 retains the original value',
      activity === 'guided-sum-v1' ? 'B3 retains the original value' : 'B3 matches the original B2',
      'B4 retains the original value', 'SUM formula uses B2:B4'];
    const passed = target.map((expected, index) => numberMatches(inputs[index], expected));
    passed.push(formulaMatches(formula, sum.worksheet.formula));
    if (activity === 'independent-format-v1') {
      const tools = toolEvidence(toolState);
      labels.splice(0, labels.length, 'A1 is bold', 'A1 has yellow fill', 'A1 has borders', 'All original numeric values preserved');
      passed.splice(0, passed.length, tools.bold, tools.fill, tools.border,
        original.every((expected, index) => numberMatches(inputs[index], expected)));
    } else if (activity === 'independent-copy-v1') {
      labels.push('Used Ribbon Copy B2 and Paste B3');
      passed.push(toolEvidence(toolState).copy_used);
    }
    return result(labels.map((label, index) => ({ label, passed: passed[index] })));
  }
  global.CommonplaceExcelCurriculum = Object.freeze({
    listLessons: runtimeRef => clone(runtimeRef === undefined
      ? lessons : resolveRuntime(runtimeRef).lessons.map(resolveLesson)),
    resolveLesson, resolveCapability, resolveRuntime, resolveRubric,
    evaluateFormula, gradeFormula, checkCriterion, gradeAssigned,
    parseReferenceFormula, copyReferenceFormula, evaluateReferenceFormula, gradeReferences,
    parseDecisionFormula, evaluateDecisionFormula, gradeDecision,
    validateConditionalRule, conditionalView, gradeConditional,
    parseLookupFormula, evaluateLookupFormula, gradeLookup,
    parseSummaryFormula, evaluateSummaryFormula, gradeSummary,
    createTableState, applyTableAction, tableView, inspectTableValidation, formatTableValue, gradeTables,
  });
})(typeof window === 'undefined' ? globalThis : window);
