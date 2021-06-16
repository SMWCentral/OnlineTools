async function download(/** @type string */ name, /** @type Blob */ blob){
    const download = document.createElement("a");
    download.href = URL.createObjectURL(blob);
    download.download = name;
    download.rel = "noopener";

    setTimeout(() => {
        download.click();
    }, 0);

    await new Promise((resolve) => {
        setTimeout(() => {
            URL.revokeObjectURL(download.href);
            resolve();
        }, 250);
    });
}

export function init(toolID){
    const root = document.getElementById(`tool-${toolID}`);

    let lastHeight;

    const observer = new ResizeObserver(() => {
        const height = document.scrollingElement.scrollHeight;

        if(lastHeight !== height){
            lastHeight = height;
            window.parent.postMessage({height}, "*");
        }
    });

    observer.observe(document.scrollingElement);

    let statusDOM;

    return {
        root,
        byID: (/** @type string */ id) => root.querySelector(`#${id}`),
        setStatus: (status) => {
            if(statusDOM == null){
                const container = document.getElementById("status") ?? document.createElement("div");
                container.style.display = "none";

                const statusDiv = document.createElement("div");
                statusDiv.style.whiteSpace = "pre-wrap";

                container.appendChild(document.createElement("hr"));
                container.appendChild(statusDiv);

                if(!container.isConnected){
                    root.appendChild(container);
                }

                statusDOM = {container, status: statusDiv};
            }

            if(status.error != null){
                statusDOM.container.style.display = "";
                statusDOM.status.innerText = `❌ Error: ${status.error}`;
            }else if(status.success != null){
                statusDOM.container.style.display = "";
                statusDOM.status.innerText = `✅ ${status.success}`;
            }else if(status.message != null){
                statusDOM.container.style.display = "";
                statusDOM.status.innerText = status.message;
            }else{
                statusDOM.container.style.display = "none";
            }
        },
        download
    };
}
