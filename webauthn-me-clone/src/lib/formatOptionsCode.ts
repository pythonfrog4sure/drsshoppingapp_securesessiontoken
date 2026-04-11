/** Pretty-print buffers as Uint8Array literals for display only */
function bufToLiteral(buf: ArrayBuffer): string {
  const u = new Uint8Array(buf)
  if (u.length === 0) return 'new Uint8Array(0)'
  const nums = Array.from(u).join(', ')
  return `new Uint8Array([${nums}]).buffer`
}

export function formatCreatePublicKeyOptions(
  pk: PublicKeyCredentialCreationOptions,
  rpIdFallback: string
): string {
  const lines: string[] = []
  lines.push('navigator.credentials.create({')
  lines.push('  publicKey: {')
  lines.push(`    challenge: ${bufToLiteral(pk.challenge as ArrayBuffer)},`)

  lines.push('    rp: {')
  lines.push(`      id: ${JSON.stringify(pk.rp.id ?? rpIdFallback)},`)
  lines.push(`      name: ${JSON.stringify(pk.rp.name)},`)
  lines.push('    },')

  lines.push('    user: {')
  lines.push(`      id: ${bufToLiteral(pk.user.id as ArrayBuffer)},`)
  lines.push(`      name: ${JSON.stringify(pk.user.name)},`)
  lines.push(`      displayName: ${JSON.stringify(pk.user.displayName)},`)
  lines.push('    },')

  const params = (pk.pubKeyCredParams || [])
    .map((p) => `      { type: 'public-key', alg: ${p.alg} }`)
    .join(',\n')
  lines.push(`    pubKeyCredParams: [\n${params}\n    ],`)

  if (pk.timeout != null) lines.push(`    timeout: ${pk.timeout},`)

  if (pk.excludeCredentials?.length) {
    const ex = pk.excludeCredentials
      .map((c) => {
        const id = bufToLiteral(c.id as ArrayBuffer)
        const t = c.transports?.length
          ? `, transports: [${c.transports.map((x) => `'${x}'`).join(', ')}]`
          : ''
        return `      { type: 'public-key', id: ${id}${t} }`
      })
      .join(',\n')
    lines.push(`    excludeCredentials: [\n${ex}\n    ],`)
  }

  if (pk.authenticatorSelection) {
    const a = pk.authenticatorSelection
    lines.push('    authenticatorSelection: {')
    if (a.authenticatorAttachment != null && a.authenticatorAttachment !== '') {
      lines.push(`      authenticatorAttachment: '${a.authenticatorAttachment}',`)
    }
    if (a.residentKey != null) lines.push(`      residentKey: '${a.residentKey}',`)
    if (a.userVerification != null) lines.push(`      userVerification: '${a.userVerification}',`)
    lines.push('    },')
  }

  if (pk.attestation != null) lines.push(`    attestation: '${pk.attestation}',`)

  if (pk.extensions && Object.keys(pk.extensions).length > 0) {
    const e = pk.extensions as Record<string, unknown>
    lines.push('    extensions: {')
    for (const key of Object.keys(e)) {
      const v = e[key]
      lines.push(`      ${key}: ${JSON.stringify(v)},`)
    }
    lines.push('    },')
  }

  lines.push('  }')
  lines.push('})')
  return lines.join('\n')
}
