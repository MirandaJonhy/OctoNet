// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.

const axios = require('axios');

async function getTopTechNews() {
    try {
        const topStoriesResponse = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json');
        const topStoriesIds = topStoriesResponse.data.slice(0, 3);

        const news = await Promise.all(
            topStoriesIds.map(async (id) => {
                const storyResponse = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
                return storyResponse.data;
            })
        );

        return news.map(story => `• *${story.title}*\n  Link: ${story.url || `https://news.ycombinator.com/item?id=${story.id}`}`).join('\n\n');
    } catch (error) {
        console.error("Erro ao buscar notícias:", error);
        return "Sorry, I couldn't fetch the latest tech news right now.";
    }
}

async function getTrendingRepos() {
    try {
        // Usando uma API pública simples para trending repos
        const response = await axios.get('https://api.github.com/search/repositories?q=stars:>10000&sort=stars&order=desc');
        const repos = response.data.items.slice(0, 3);
        return repos.map(repo => `• *${repo.full_name}* (${repo.stargazers_count} stars)\n  Description: ${repo.description}\n  Link: ${repo.html_url}`).join('\n\n');
    } catch (error) {
        console.error("Erro ao buscar trending repos:", error);
        return "Sorry, I couldn't fetch trending repositories right now.";
    }
}

module.exports = { getTopTechNews, getTrendingRepos };