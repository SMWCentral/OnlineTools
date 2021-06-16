export default (tools) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Online Tools - SMW Central</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <h1>Online Tools</h1>
    <ul>
        ${tools.slice().sort(
            (a, b) => a.info.name.localeCompare(b.info.name)
        ).map(
            (tool) => `<li><a href="${tool.id}">${tool.info.name}</a></li>`).join("\n        ")
        }
    </ul>
</body>
</html>
`;
