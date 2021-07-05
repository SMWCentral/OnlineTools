export default ({id, name, authors, styles, markup, scripts, lateScripts}, escape) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${escape(name)} - Online Tools - SMW Central</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="author" content="${escape(authors)}">
    ${styles}
</head>
<body>
    ${markup}
    ${scripts}
    <script type="module">
        import {run} from "../api.js";
        import tool from "./index.js";

        run(${JSON.stringify(id)}, tool);
    </script>
    ${lateScripts}
</body>
</html>
`;
