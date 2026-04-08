export async function POST(request) {
  try {
    const { language, code, stdin = '' } = await request.json()

    const LANGUAGE_MAP = {
      javascript: { language: 'javascript', version: '18.15.0' },
      python: { language: 'python', version: '3.10.0' },
      java: { language: 'java', version: '15.0.2' },
      cpp: { language: 'c++', version: '10.2.0' },
      c: { language: 'c', version: '10.2.0' },
      typescript: { language: 'typescript', version: '5.0.3' },
      rust: { language: 'rust', version: '1.50.0' },
      go: { language: 'go', version: '1.16.2' },
      php: { language: 'php', version: '8.2.3' },
      ruby: { language: 'ruby', version: '3.0.1' },
      kotlin: { language: 'kotlin', version: '1.8.20' },
      swift: { language: 'swift', version: '5.3.3' },
      bash: { language: 'bash', version: '5.2.0' },
    }

    const langConfig = LANGUAGE_MAP[language] || LANGUAGE_MAP['python']

    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: langConfig.language,
        version: langConfig.version,
        files: [{ name: 'main', content: code }],
        stdin,
      }),
    })

    const data = await response.json()

    return Response.json({
      stdout: data.run?.stdout || '',
      stderr: data.run?.stderr || '',
      exitCode: data.run?.code,
      signal: data.run?.signal,
    })

  } catch (error) {
    return Response.json(
      { error: 'Code run nahi hua. Network check karo.', details: error.message },
      { status: 500 }
    )
  }
}
