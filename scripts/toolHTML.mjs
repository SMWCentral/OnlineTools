export default ({id, name, authors, styles, markup, scripts}) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${name} - Online Tools - SMW Central</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="author" content="${authors}">
    ${styles}
</head>
<body>
    ${markup}
    ${scripts}
    <script type="module">
        import {init} from "../api.js";
        import tool from "./index.js";

        tool(init(${JSON.stringify(id)}));
    </script>
</body>
</html>
`;
