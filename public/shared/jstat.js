export default await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = 'https://cdn.jsdelivr.net/jstat/latest/jstat.min.js';
    document.head.appendChild(script);
    script.onload = function () {
        resolve(jStat);
    }
    script.onerror = reject;
})
