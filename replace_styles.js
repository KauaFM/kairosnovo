const fs = require('fs');
let code = fs.readFileSync('src/components/Metrics/NodeDashboards.jsx', 'utf8');

// The top level view for CapitalView background
code = code.replace(/backgroundColor: 'hsl\\(220, 18%, 7%\\)'/g, 'backgroundColor: \\'var(--bg - color) \\'');
code = code.replace(/backgroundColor: 'hsl\\(0, 0%, 100%\\)'/g, 'backgroundColor: \\'var(--bg - color) \\'');

// NewCard backgrounds
code = code.replace(/backgroundColor: 'hsl\\(220, 18%, 10%\\)'/g, 'backgroundColor: \\'var(--glass - bg) \\', backdropFilter: \\'blur(12px) \\'');
code = code.replace(/backgroundColor: 'hsla\\(0, 0%, 100%, 0.03\\)'/g, 'backgroundColor: \\'var(--glass - bg) \\'');
code = code.replace(/backgroundColor: 'hsla\\(0, 0%, 100%, 0.04\\)'/g, 'backgroundColor: \\'var(--glass - bg) \\'');
code = code.replace(/backgroundColor: 'hsla\\(0, 0%, 100%, 0.12\\)'/g, 'backgroundColor: \\'var(--glass - bg) \\', backdropFilter: \\'blur(8px) \\'');

// Hover states or backgrounds
code = code.replace(/backgroundColor: '#ffffff'/g, 'backgroundColor: \\'var(--accent - primary) \\'');
code = code.replace(/backgroundColor: 'hsl\\(215, 25%, 15%\\)'/g, 'backgroundColor: \\'var(--accent - primary) \\'');
code = code.replace(/color: 'hsl\\(220, 18%, 10%\\)'/g, 'color: \\'var(--accent - secondary) \\'');

// Text colors
code = code.replace(/color: '#ffffff'/g, 'color: \\'var(--text - main) \\'');
code = code.replace(/color: 'hsla\\(0, 0%, 100%, 0.4\\)'/g, 'color: \\'var(--text - dim) \\'');
code = code.replace(/color: 'hsla\\(0, 0%, 100%, 0.6\\)'/g, 'color: \\'var(--text - dim) \\'');
code = code.replace(/color: 'hsla\\(0, 0%, 100%, 0.5\\)'/g, 'color: \\'var(--text - dim) \\'');
code = code.replace(/color: 'hsl\\(215, 15%, 55%\\)'/g, 'color: \\'var(--text - dim) \\'');
code = code.replace(/color: 'hsl\\(215, 25%, 15%\\)'/g, 'color: \\'var(--text - main) \\'');

// Borders
code = code.replace(/border: '1px solid hsla\\(0, 0%, 100%, 0.08\\)'/g, 'border: \\'1px solid var(--border - color) \\'');
code = code.replace(/border: '1px solid hsla\\(0, 0%, 100%, 0.15\\)'/g, 'border: \\'1px solid var(--border - color) \\'');
code = code.replace(/border: '1px solid hsla\\(0, 0%, 100%, 0.04\\)'/g, 'border: \\'1px solid var(--border - color) \\'');
code = code.replace(/border: '1px dashed hsla\\(0, 0%, 100%, 0.15\\)'/g, 'border: \\'1px dashed var(--border - color) \\'');
code = code.replace(/border: '1px dashed hsl\\(215, 20%, 85%\\)'/g, 'border: \\'1px dashed var(--border - color) \\'');
code = code.replace(/boxShadow: '0 4px 16px rgba\\(0,0,0,0.2\\)'/g, 'boxShadow: \\'var(--glass - shadow) \\'');
code = code.replace(/boxShadow: '0 4px 12px rgba\\(0,0,0,0.3\\)'/g, 'boxShadow: \\'var(--glass - shadow) \\'');

// General success / green
code = code.replace(/color: 'hsl\\(152, 68%, 55%\\)'/g, 'color: \\'var(--success - color) \\'');
code = code.replace(/backgroundColor: 'hsl\\(152, 68%, 55%\\)'/g, 'backgroundColor: \\'var(--success - color) \\'');
code = code.replace(/backgroundColor: 'hsla\\(152, 68%, 55%, 0.15\\)'/g, 'backgroundColor: \\'var(--success - bg) \\'');
code = code.replace(/backgroundColor: 'hsla\\(152, 68%, 55%, 0.25\\)'/g, 'backgroundColor: \\'var(--success - bg) \\'');
code = code.replace(/backgroundColor: 'hsla\\(152, 68%, 55%, 0.55\\)'/g, 'backgroundColor: \\'var(--success - color) \\'');
code = code.replace(/stroke="hsl\\(152, 68%, 55%\\)"/g, 'stroke="var(--success-color)"');
code = code.replace(/stopColor="hsl\\(152, 68%, 55%\\)"/g, 'stopColor="var(--success-color)"');
code = code.replace(/borderLeft: '1px dashed hsla\\(152, 68%, 55%, 0.4\\)'/g, 'borderLeft: \\'1px dashed var(--success - bg) \\'');
code = code.replace(/color: 'hsl\\(152, 68%, 40%\\)'/g, 'color: \\'var(--success - color) \\'');
code = code.replace(/backgroundColor: 'hsl\\(152, 68%, 40%\\)'/g, 'backgroundColor: \\'var(--success - color) \\'');
code = code.replace(/backgroundColor: 'hsl\\(152, 68%, 50%\\)'/g, 'backgroundColor: \\'var(--success - color) \\'');

// General destructive / red
code = code.replace(/color: 'hsl\\(0, 84%, 60%\\)'/g, 'color: \\'var(--destructive - color) \\'');
code = code.replace(/color: 'hsl\\(0, 80%, 65%\\)'/g, 'color: \\'var(--destructive - color) \\'');
code = code.replace(/color: 'hsl\\(0, 84%, 65%\\)'/g, 'color: \\'var(--destructive - color) \\'');
code = code.replace(/backgroundColor: 'hsl\\(0, 84%, 60%\\)'/g, 'backgroundColor: \\'var(--destructive - color) \\'');
code = code.replace(/backgroundColor: 'hsla\\(0, 84%, 60%, 0.15\\)'/g, 'backgroundColor: \\'var(--destructive - bg) \\'');
code = code.replace(/color="hsl\\(0, 84%, 60%\\)"/g, 'color="var(--destructive-color)"');

// Specific heatmap dynamic styles needs manual check, but the script replacing string literals should be mostly accurate since it matches the literal text.
code = code.replace(/hsla\\(152, 68%, 55%, \\$\\{intensity\\}\\)/g, '\\`color-mix(in srgb, var(--success-color) ${intensity * 100}%, transparent)\\`');
code = code.replace(/hsla\\(152, 68%, 40%, \\$\\{intensity\\}\\)/g, '\\`color-mix(in srgb, var(--success-color) ${intensity * 100}%, transparent)\\`');
code = code.replace(/linear-gradient\\(to right, hsl\\(152, 60%, 55%\\), hsl\\(152, 68%, 45%\\)\\)/g, 'linear-gradient(to right, var(--success-color), var(--success-color))');
code = code.replace(/linear-gradient\\(to right, hsl\\(0, 84%, 65%\\), hsl\\(0, 84%, 55%\\)\\)/g, 'linear-gradient(to right, var(--destructive-color), var(--destructive-color))');

// Border colors lingering
code = code.replace(/borderBottom: idx !== transactions.length - 1 \\? '1px solid hsla\\(0, 0%, 100%, 0.08\\)' : 'none'/g, 'borderBottom: idx !== transactions.length - 1 ? \\'1px solid var(--border - color) \\' : \\'none\\'');

fs.writeFileSync('src/components/Metrics/NodeDashboards.jsx', code);
console.log('Update complete!');
