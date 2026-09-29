const fs = require('fs');
const file = 'BidderDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// Use regex to find the block
const addRowRegex = /\{\s*isAdding && \(\s*<tr className="draft-row fresh">[\s\S]*?<\/tr>\s*\)\s*\}/;
const match = content.match(addRowRegex);

if (!match) {
  console.log('Could not find isAdding start');
  process.exit(1);
}

const blockToMove = match[0];
content = content.replace(blockToMove, '');

const tbodyStartRegex = /<tbody>\s*\{\s*filteredRows\.map\(\(r\) => \{/;
const startMatch = content.match(tbodyStartRegex);
if (!startMatch) {
  console.log('Could not find tbody start');
  process.exit(1);
}

content = content.replace(startMatch[0], `<tbody>\n              ${blockToMove}\n              {filteredRows.map((r) => {`);

// Add the button next to the search bar
const searchBarRegex = /<div style={{ marginBottom: "1rem" }}>\s*<input\s*type="text"\s*className="f"\s*placeholder="Search client name\.\.\."\s*value=\{searchQuery\}\s*onChange=\{\(e\) => setSearchQuery\(e\.target\.value\)\}\s*style=\{\{ maxWidth: "300px" \}\}\s*\/>\s*<\/div>/;

const newSearchBar = `<div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <input
              type="text"
              className="f"
              placeholder="Search client name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ maxWidth: "300px" }}
            />
            {!isAdding && (
              <button className="btn mini add-row" onClick={addRow}>
                + Add a client
              </button>
            )}
          </div>`;

if (content.match(searchBarRegex)) {
  content = content.replace(searchBarRegex, newSearchBar);
} else {
  console.log('Could not find search bar');
}

fs.writeFileSync(file, content);
console.log('Done!');
