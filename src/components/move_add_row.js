const fs = require("fs");
const file = "BidderDashboard.jsx";
let content = fs.readFileSync(file, "utf8");

const isAddingStart = content.indexOf(
  '{isAdding && (\r\n                <tr className="draft-row fresh">',
);
if (isAddingStart === -1) {
  console.log("Could not find isAdding start");
  process.exit(1);
}

const tbodyEnd = content.indexOf(
  "</tbody>\r\n          </table>",
  isAddingStart,
);
if (tbodyEnd === -1) {
  console.log("Could not find tbody end");
  process.exit(1);
}

const blockToMove = content.substring(isAddingStart, tbodyEnd);
content = content.replace(blockToMove, "");

const tbodyStart = content.indexOf(
  "<tbody>\r\n              {filteredRows.map((r) => {",
);
if (tbodyStart === -1) {
  console.log("Could not find tbody start");
  process.exit(1);
}
content = content.replace(
  "<tbody>\r\n              {filteredRows.map((r) => {",
  "<tbody>\r\n              " +
    blockToMove +
    "\r\n              {filteredRows.map((r) => {",
);

// Add the button next to the search bar
const searchBarRegex =
  /<div style={{ marginBottom: "1rem" }}>\r\n            <input\r\n              type="text"\r\n              className="f"\r\n              placeholder="Search client name\.\.\."\r\n              value={searchQuery}\r\n              onChange={\(e\) => setSearchQuery\(e\.target\.value\)}\r\n              style={{ maxWidth: "300px" }}\r\n            \/>\r\n          <\/div>/;

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

content = content.replace(searchBarRegex, newSearchBar);

fs.writeFileSync(file, content);
console.log("Done!");
