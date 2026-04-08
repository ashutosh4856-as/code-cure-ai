// ─── GitHub Push Helper ───────────────────────────────────────────

export async function pushToGitHub({ token, owner, repo, files, commitMessage, createNew }) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github.v3+json',
  }

  // 1. नई repo बनानी है तो
  if (createNew) {
    await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: repo, private: false, auto_init: true }),
    })
    await new Promise(r => setTimeout(r, 1500)) // wait for init
  }

  // 2. हर file को push करो
  const results = []
  for (const file of files) {
    const content = btoa(unescape(encodeURIComponent(file.content)))
    const filePath = file.path

    // पहले check करो file already exists या नहीं (SHA के लिए)
    let sha = null
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, { headers })
      if (res.ok) {
        const data = await res.json()
        sha = data.sha
      }
    } catch {}

    const body = {
      message: commitMessage || `Code-Cure AI: ${filePath}`,
      content,
      ...(sha && { sha }),
    }

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    })

    const data = await res.json()
    results.push({ file: filePath, success: res.ok, url: data?.content?.html_url })
  }

  return results
}

export async function getUserRepos(token) {
  const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const data = await res.json()
  return data.map(r => ({ name: r.name, full_name: r.full_name }))
}

export async function getGitHubUser(token) {
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}` }
  })
  return await res.json()
}
