document.addEventListener('DOMContentLoaded', () => {
    fetchPapers();
});

async function fetchPapers() {
    const response = await fetch('https://export.arxiv.org/api/query?search_query=all:your_keywords&start=0&max_results=10');
    const data = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data, 'application/xml');
    const entries = xmlDoc.getElementsByTagName('entry');
    const paperList = document.getElementById('paper-list');

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const title = entry.getElementsByTagName('title')[0].textContent;
        const authors = Array.from(entry.getElementsByTagName('author')).map(author => author.getElementsByTagName('name')[0].textContent).join(', ');
        const summary = entry.getElementsByTagName('summary')[0].textContent;
        const pdfLink = entry.getElementsByTagName('link')[0].getAttribute('href');

        const paperDiv = document.createElement('div');
        paperDiv.classList.add('paper');

        paperDiv.innerHTML = `
            <h3>${title}</h3>
            <p><strong>Authors:</strong> ${authors}</p>
            <p>${summary}</p>
            <a href="${pdfLink}" target="_blank">Read PDF</a>
        `;

        paperList.appendChild(paperDiv);
    }
}
