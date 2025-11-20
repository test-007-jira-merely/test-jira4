document.addEventListener('DOMContentLoaded', () => {
    const ROWS = 100;
    const COLS = 26;
    const spreadsheetContainer = document.getElementById('spreadsheet-container');
    const exportBtn = document.getElementById('export-csv');
    const importBtn = document.getElementById('import-csv');
    const csvFileInput = document.getElementById('csv-file-input');

    let sheetData = Array(ROWS).fill(null).map(() => Array(COLS).fill(null).map(() => ({ raw: '', value: '', dependencies: new Set() })));
    const dependentsGraph = new Map(); // key: cellId, value: Set of cellIds that depend on it

    function getCellId(row, col) {
        return `${String.fromCharCode(65 + col)}${row + 1}`;
    }

    function parseCellId(id) {
        const match = id.match(/^([A-Z]+)(\d+)$/);
        if (!match) return null;
        
        let col = 0;
        for (let i = 0; i < match[1].length; i++) {
            col = col * 26 + (match[1].charCodeAt(i) - 65 + 1);
        }
        col -= 1;

        const row = parseInt(match[2], 10) - 1;
        return { row, col };
    }
    
    function renderTable() {
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        const headerRow = document.createElement('tr');
        headerRow.appendChild(document.createElement('th'));
        for (let col = 0; col < COLS; col++) {
            const th = document.createElement('th');
            th.textContent = String.fromCharCode(65 + col);
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);

        for (let row = 0; row < ROWS; row++) {
            const tr = document.createElement('tr');
            const th = document.createElement('th');
            th.textContent = row + 1;
            tr.appendChild(th);
            for (let col = 0; col < COLS; col++) {
                const td = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'text';
                input.id = getCellId(row, col);
                input.value = sheetData[row][col].raw;
                td.appendChild(input);
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }

        table.appendChild(thead);
        table.appendChild(tbody);
        spreadsheetContainer.innerHTML = '';
        spreadsheetContainer.appendChild(table);
    }

    function updateCell(cellId, inputValue) {
        const coords = parseCellId(cellId);
        if (!coords) return;
        const { row, col } = coords;

        const cell = sheetData[row][col];
        cell.raw = inputValue;

        // Clear old dependencies
        for (const dep of cell.dependencies) {
            if (dependentsGraph.has(dep)) {
                dependentsGraph.get(dep).delete(cellId);
            }
        }
        cell.dependencies.clear();

        if (inputValue.startsWith('=')) {
            try {
                const formula = inputValue.slice(1);
                const newDependencies = getDependencies(formula);
                
                if (hasCircularReference(cellId, newDependencies)) {
                    throw new Error("Circular reference detected!");
                }
                
                newDependencies.forEach(dep => {
                    cell.dependencies.add(dep);
                    if (!dependentsGraph.has(dep)) {
                        dependentsGraph.set(dep, new Set());
                    }
                    dependentsGraph.get(dep).add(cellId);
                });

                cell.value = evaluateFormula(formula);
            } catch (e) {
                cell.value = `#ERROR: ${e.message}`;
                alert(e.message);
            }
        } else {
            cell.value = inputValue;
        }
        
        const inputElement = document.getElementById(cellId);
        if(document.activeElement !== inputElement) {
            inputElement.value = cell.value;
        }
        recalculateDependents(cellId);
    }
    
    function getDependencies(formulaStr) {
        const cellRegex = /[A-Z]+\d+/g;
        const dependencies = new Set();
        
        const matches = formulaStr.match(cellRegex);
        if (matches) {
            matches.forEach(ref => {
                if (ref.includes(':')) {
                    const [start, end] = ref.split(':');
                    const startCoords = parseCellId(start);
                    const endCoords = parseCellId(end);
                    if (startCoords && endCoords) {
                        for (let r = Math.min(startCoords.row, endCoords.row); r <= Math.max(startCoords.row, endCoords.row); r++) {
                            for (let c = Math.min(startCoords.col, endCoords.col); c <= Math.max(startCoords.col, endCoords.col); c++) {
                                dependencies.add(getCellId(r, c));
                            }
                        }
                    }
                } else {
                    dependencies.add(ref);
                }
            });
        }
        return dependencies;
    }

    function hasCircularReference(cellId, newDependencies) {
        const stack = [...newDependencies];
        const visited = new Set(stack);

        while (stack.length > 0) {
            const currentDep = stack.pop();
            if (currentDep === cellId) {
                return true;
            }
            
            if (dependentsGraph.has(currentDep)) {
                for (const dependent of dependentsGraph.get(currentDep)) {
                    if (!visited.has(dependent)) {
                        visited.add(dependent);
                        stack.push(dependent);
                    }
                }
            }
        }
        return false;
    }
    
    function evaluateFormula(formula) {
        let evalStr = formula.toUpperCase();

        evalStr = evalStr.replace(/SUM\(([^)]+)\)/g, (match, rangeStr) => {
            let sum = 0;
            const refs = rangeStr.split(',');
            for (const ref of refs) {
                if(ref.includes(':')) {
                    const [start, end] = ref.split(':');
                    const startCoords = parseCellId(start);
                    const endCoords = parseCellId(end);
                    if (startCoords && endCoords) {
                        for (let r = Math.min(startCoords.row, endCoords.row); r <= Math.max(startCoords.row, endCoords.row); r++) {
                            for (let c = Math.min(startCoords.col, endCoords.col); c <= Math.max(startCoords.col, endCoords.col); c++) {
                                const val = sheetData[r][c].value;
                                if (!isNaN(parseFloat(val))) {
                                    sum += parseFloat(val);
                                }
                            }
                        }
                    }
                } else {
                    const coords = parseCellId(ref);
                    if (coords) {
                         const val = sheetData[coords.row][coords.col].value;
                         if(!isNaN(parseFloat(val))){
                             sum += parseFloat(val);
                         }
                     }
                }
            }
            return sum;
        });
        
        evalStr = evalStr.replace(/[A-Z]+\d+/g, (match) => {
            const coords = parseCellId(match);
            if (coords) {
                const val = sheetData[coords.row][coords.col].value;
                return isNaN(parseFloat(val)) ? 0 : val;
            }
            return match; // Should not happen if getDependencies is correct
        });

        try {
            return new Function('return ' + evalStr)();
        } catch (e) {
            throw new Error('Invalid formula syntax');
        }
    }

    function recalculateDependents(cellId) {
        if (dependentsGraph.has(cellId)) {
            for (const dependentId of dependentsGraph.get(cellId)) {
                const { row, col } = parseCellId(dependentId);
                const cell = sheetData[row][col];
                updateCell(dependentId, cell.raw);
            }
        }
    }

    function initEventListeners() {
        spreadsheetContainer.addEventListener('blur', (e) => {
            if (e.target.tagName === 'INPUT') {
                updateCell(e.target.id, e.target.value);
                e.target.value = sheetData[parseCellId(e.target.id).row][parseCellId(e.target.id).col].value;
            }
        }, true);

        spreadsheetContainer.addEventListener('focus', (e) => {
            if (e.target.tagName === 'INPUT') {
                const cellId = e.target.id;
                const {row, col} = parseCellId(cellId);
                e.target.value = sheetData[row][col].raw;
            }
        }, true);

        spreadsheetContainer.addEventListener('keydown', (e) => {
            if (e.target.tagName !== 'INPUT') return;
            const cellId = e.target.id;
            const { row, col } = parseCellId(cellId);

            let nextRow = row, nextCol = col;
            let moved = true;

            switch (e.key) {
                case 'Enter':
                    nextRow = e.shiftKey ? row - 1 : row + 1;
                    break;
                case 'Tab':
                    nextCol = e.shiftKey ? col - 1 : col + 1;
                    break;
                case 'ArrowUp':
                    nextRow = row - 1;
                    break;
                case 'ArrowDown':
                    nextRow = row + 1;
                    break;
                case 'ArrowLeft':
                    nextCol = col - 1;
                    break;
                case 'ArrowRight':
                    nextCol = col + 1;
                    break;
                default:
                    moved = false;
            }

            if (moved) {
                e.preventDefault();
                if (nextRow >= 0 && nextRow < ROWS && nextCol >= 0 && nextCol < COLS) {
                    const nextCellId = getCellId(nextRow, nextCol);
                    const nextCell = document.getElementById(nextCellId);
                    if (nextCell) {
                        nextCell.focus();
                    }
                }
            }
        });

        exportBtn.addEventListener('click', exportCSV);
        importBtn.addEventListener('click', () => csvFileInput.click());
        csvFileInput.addEventListener('change', importCSV);
    }
    
    function exportCSV() {
        const csv = sheetData.map(row => row.map(cell => `"${(cell.raw || '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'spreadsheet.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function importCSV(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const rows = text.split('\n');
            const parsedCSV = rows.map(row => row.split(',').map(cell => cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"')));
            
            dependentsGraph.clear();
            sheetData = Array(ROWS).fill(null).map(() => Array(COLS).fill(null).map(() => ({ raw: '', value: '', dependencies: new Set() })));

            for (let r = 0; r < Math.min(ROWS, parsedCSV.length); r++) {
                for (let c = 0; c < Math.min(COLS, parsedCSV[r].length); c++) {
                    sheetData[r][c].raw = parsedCSV[r][c] || '';
                }
            }

            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const cellId = getCellId(r, c);
                    const cell = sheetData[r][c];
                    updateCell(cellId, cell.raw);
                }
            }
            renderTable();
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    renderTable();
    initEventListeners();
});
