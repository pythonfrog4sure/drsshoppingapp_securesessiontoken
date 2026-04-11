import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildPublicKeyCredentialCreationOptions,
  defaultRegisterDebuggerState,
  type ExcludeCredRow,
  type RegisterDebuggerState,
} from '../lib/buildRegisterOptions'
import { COSE_ALG_CHOICES } from '../lib/coseAlgs'
import { formatCreatePublicKeyOptions } from '../lib/formatOptionsCode'
import { bufferToBase64url, randomBytes } from '../lib/base64url'

function shortHex(buf: Uint8Array, max = 24): string {
  const slice = buf.length > max ? buf.slice(0, max) : buf
  const h = Array.from(slice)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return buf.length > max ? `${h}… (${buf.length} bytes)` : h
}

type Props = {
  initialUserName?: string
  disabled?: boolean
  onValidationError: (message: string) => void
  onRegister: (publicKey: PublicKeyCredentialCreationOptions) => Promise<void>
}

const emptyExcludeRow = (): ExcludeCredRow => ({
  idBase64Url: '',
  usb: false,
  nfc: false,
  ble: false,
  internal: false,
})

export function RegisterDebuggerPanel({ initialUserName, disabled, onValidationError, onRegister }: Props) {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const [state, setState] = useState<RegisterDebuggerState>(() => {
    const d = defaultRegisterDebuggerState()
    if (initialUserName) d.userName = initialUserName
    return d
  })

  useEffect(() => {
    if (initialUserName) {
      setState((s) => ({ ...s, userName: initialUserName }))
    }
  }, [initialUserName])

  const built = useMemo(
    () => buildPublicKeyCredentialCreationOptions(state, host),
    [state, host]
  )

  const previewCode = useMemo(
    () => formatCreatePublicKeyOptions(built, host),
    [built, host]
  )

  const regenUserId = useCallback(() => {
    setState((s) => ({ ...s, userId: randomBytes(16) }))
  }, [])

  const regenChallenge = useCallback(() => {
    setState((s) => ({ ...s, challenge: randomBytes(32) }))
  }, [])

  const updateParamAlg = useCallback((index: number, alg: number) => {
    setState((s) => {
      const pubKeyCredParams = [...s.pubKeyCredParams]
      pubKeyCredParams[index] = { alg }
      return { ...s, pubKeyCredParams }
    })
  }, [])

  const addParamRow = useCallback(() => {
    setState((s) => ({
      ...s,
      pubKeyCredParams: [...s.pubKeyCredParams, { alg: -7 }],
    }))
  }, [])

  const removeParamRow = useCallback((index: number) => {
    setState((s) => {
      if (s.pubKeyCredParams.length <= 1) return s
      const pubKeyCredParams = s.pubKeyCredParams.filter((_, i) => i !== index)
      return { ...s, pubKeyCredParams }
    })
  }, [])

  const addExcludeRow = useCallback(() => {
    setState((s) => ({
      ...s,
      excludeCredentials: [...s.excludeCredentials, emptyExcludeRow()],
    }))
  }, [])

  const updateExclude = useCallback((index: number, patch: Partial<ExcludeCredRow>) => {
    setState((s) => {
      const excludeCredentials = s.excludeCredentials.map((row, i) =>
        i === index ? { ...row, ...patch } : row
      )
      return { ...s, excludeCredentials }
    })
  }, [])

  const removeExcludeRow = useCallback((index: number) => {
    setState((s) => ({
      ...s,
      excludeCredentials: s.excludeCredentials.filter((_, i) => i !== index),
    }))
  }, [])

  const onExcludeFile = useCallback((index: number, file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const buf = reader.result as ArrayBuffer
      const b64 = bufferToBase64url(buf)
      updateExclude(index, { idBase64Url: b64 })
    }
    reader.readAsArrayBuffer(file)
  }, [updateExclude])

  const runRegister = () => {
    const name = state.userName.trim()
    if (!name) {
      onValidationError('Enter a user name.')
      return
    }
    if (state.userId.byteLength > 64) {
      onValidationError('User handle id must be at most 64 bytes.')
      return
    }
    if (state.challenge.byteLength < 16) {
      onValidationError('Challenge must be at least 16 bytes.')
      return
    }
    void onRegister(buildPublicKeyCredentialCreationOptions(state, host))
  }

  return (
    <div className="debugger">
      <div className="debugger-head">
        <h3 className="debugger-title">Register new credentials</h3>
        <p className="hint">
          Options mirror{' '}
          <a href="https://www.webauthn.me/debugger" target="_blank" rel="noreferrer">
            webauthn.me/debugger
          </a>
          . Values update the preview below.
        </p>
      </div>

      <div className="debugger-grid">
        <fieldset className="dbg-fieldset">
          <legend>rp</legend>
          <label>id</label>
          <input
            type="text"
            spellCheck={false}
            value={state.rpId}
            onChange={(e) => setState((s) => ({ ...s, rpId: e.target.value }))}
            disabled={disabled}
            placeholder={host}
          />
          <label>name</label>
          <input
            type="text"
            value={state.rpName}
            onChange={(e) => setState((s) => ({ ...s, rpName: e.target.value }))}
            disabled={disabled}
          />
        </fieldset>

        <fieldset className="dbg-fieldset">
          <legend>user</legend>
          <label>
            id <span className="mono-muted">(binary)</span>{' '}
            <button type="button" className="linkish" onClick={regenUserId} disabled={disabled}>
              Regenerate
            </button>
          </label>
          <div className="mono-muted small">{shortHex(state.userId)}</div>
          <label>name</label>
          <input
            type="text"
            autoComplete="username webauthn"
            value={state.userName}
            onChange={(e) => setState((s) => ({ ...s, userName: e.target.value }))}
            disabled={disabled}
            placeholder="you@example.com"
          />
          <label>displayName</label>
          <input
            type="text"
            value={state.userDisplayName}
            onChange={(e) => setState((s) => ({ ...s, userDisplayName: e.target.value }))}
            disabled={disabled}
          />
        </fieldset>

        <fieldset className="dbg-fieldset">
          <legend>challenge</legend>
          <label>
            binary{' '}
            <button type="button" className="linkish" onClick={regenChallenge} disabled={disabled}>
              Regenerate
            </button>
          </label>
          <div className="mono-muted small">{shortHex(state.challenge)}</div>
        </fieldset>

        <fieldset className="dbg-fieldset">
          <legend>pubKeyCredParams</legend>
          {state.pubKeyCredParams.map((row, i) => (
            <div key={i} className="param-row">
              <select
                value={row.alg}
                onChange={(e) => updateParamAlg(i, Number(e.target.value))}
                disabled={disabled}
              >
                {COSE_ALG_CHOICES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="ghost tiny"
                onClick={() => removeParamRow(i)}
                disabled={disabled || state.pubKeyCredParams.length <= 1}
              >
                −
              </button>
            </div>
          ))}
          <button type="button" className="ghost tiny add-btn" onClick={addParamRow} disabled={disabled}>
            + Add algorithm
          </button>
        </fieldset>

        <fieldset className="dbg-fieldset">
          <legend>timeout (ms)</legend>
          <input
            type="number"
            min={0}
            step={1000}
            value={state.timeout}
            onChange={(e) => setState((s) => ({ ...s, timeout: Number(e.target.value) || 0 }))}
            disabled={disabled}
          />
        </fieldset>

        <fieldset className="dbg-fieldset">
          <legend>excludeCredentials</legend>
          {state.excludeCredentials.length === 0 ? (
            <p className="hint small">No excluded credentials.</p>
          ) : null}
          {state.excludeCredentials.map((row, i) => (
            <div key={i} className="exclude-block">
              <label>id (base64url)</label>
              <input
                type="text"
                spellCheck={false}
                value={row.idBase64Url}
                onChange={(e) => updateExclude(i, { idBase64Url: e.target.value })}
                disabled={disabled}
                placeholder="credential id"
              />
              <label className="small">Upload binary</label>
              <input
                type="file"
                accept="*/*"
                disabled={disabled}
                onChange={(e) => onExcludeFile(i, e.target.files?.[0] ?? null)}
              />
              <div className="transport-row">
                <span className="small">transports</span>
                <label className="chk">
                  <input
                    type="checkbox"
                    checked={row.usb}
                    onChange={(e) => updateExclude(i, { usb: e.target.checked })}
                    disabled={disabled}
                  />{' '}
                  USB
                </label>
                <label className="chk">
                  <input
                    type="checkbox"
                    checked={row.nfc}
                    onChange={(e) => updateExclude(i, { nfc: e.target.checked })}
                    disabled={disabled}
                  />{' '}
                  NFC
                </label>
                <label className="chk">
                  <input
                    type="checkbox"
                    checked={row.ble}
                    onChange={(e) => updateExclude(i, { ble: e.target.checked })}
                    disabled={disabled}
                  />{' '}
                  BLE
                </label>
                <label className="chk">
                  <input
                    type="checkbox"
                    checked={row.internal}
                    onChange={(e) => updateExclude(i, { internal: e.target.checked })}
                    disabled={disabled}
                  />{' '}
                  INTERNAL
                </label>
              </div>
              <button
                type="button"
                className="ghost tiny"
                onClick={() => removeExcludeRow(i)}
                disabled={disabled}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="ghost tiny add-btn" onClick={addExcludeRow} disabled={disabled}>
            + Add excludeCredential
          </button>
        </fieldset>

        <fieldset className="dbg-fieldset">
          <legend>authenticatorSelection</legend>
          <label>authenticatorAttachment</label>
          <select
            value={state.authenticatorAttachment}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                authenticatorAttachment: e.target.value as RegisterDebuggerState['authenticatorAttachment'],
              }))
            }
            disabled={disabled}
          >
            <option value="">(default)</option>
            <option value="platform">platform</option>
            <option value="cross-platform">cross-platform</option>
          </select>
          <label>residentKey</label>
          <select
            value={state.residentKey}
            onChange={(e) =>
              setState((s) => ({ ...s, residentKey: e.target.value as ResidentKeyRequirement }))
            }
            disabled={disabled}
          >
            <option value="discouraged">discouraged</option>
            <option value="preferred">preferred</option>
            <option value="required">required</option>
          </select>
          <label>userVerification</label>
          <select
            value={state.userVerification}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                userVerification: e.target.value as UserVerificationRequirement,
              }))
            }
            disabled={disabled}
          >
            <option value="required">required</option>
            <option value="preferred">preferred</option>
            <option value="discouraged">discouraged</option>
          </select>
        </fieldset>

        <fieldset className="dbg-fieldset">
          <legend>attestation</legend>
          <select
            value={state.attestation}
            onChange={(e) =>
              setState((s) => ({ ...s, attestation: e.target.value as AttestationConveyancePreference }))
            }
            disabled={disabled}
          >
            <option value="none">none</option>
            <option value="indirect">indirect</option>
            <option value="direct">direct</option>
            <option value="enterprise">enterprise</option>
          </select>
        </fieldset>

        <fieldset className="dbg-fieldset">
          <legend>extensions</legend>
          <label className="chk">
            <input
              type="checkbox"
              checked={state.extCredProps}
              onChange={(e) => setState((s) => ({ ...s, extCredProps: e.target.checked }))}
              disabled={disabled}
            />{' '}
            credProps
          </label>
          <label className="chk">
            <input
              type="checkbox"
              checked={state.extMinPinLength}
              onChange={(e) => setState((s) => ({ ...s, extMinPinLength: e.target.checked }))}
              disabled={disabled}
            />{' '}
            minPinLength
          </label>
          <label className="chk">
            <input
              type="checkbox"
              checked={state.extUvm}
              onChange={(e) => setState((s) => ({ ...s, extUvm: e.target.checked }))}
              disabled={disabled}
            />{' '}
            uvm
          </label>
          <label>credentialProtectionPolicy</label>
          <select
            value={state.extCredentialProtectionPolicy}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                extCredentialProtectionPolicy: e.target.value as RegisterDebuggerState['extCredentialProtectionPolicy'],
              }))
            }
            disabled={disabled}
          >
            <option value="">(none)</option>
            <option value="userVerificationOptional">userVerificationOptional</option>
            <option value="userVerificationOptionalWithCredentialIDList">
              userVerificationOptionalWithCredentialIDList
            </option>
            <option value="userVerificationRequired">userVerificationRequired</option>
          </select>
          <label className="chk">
            <input
              type="checkbox"
              checked={state.extEnforceCredentialProtectionPolicy}
              onChange={(e) =>
                setState((s) => ({ ...s, extEnforceCredentialProtectionPolicy: e.target.checked }))
              }
              disabled={disabled}
            />{' '}
            enforceCredentialProtectionPolicy
          </label>
        </fieldset>
      </div>

      <div className="preview-block">
        <h4 className="preview-title">navigator.credentials.create preview</h4>
        <pre className="code-block preview-pre">{previewCode}</pre>
      </div>

      <div className="row" style={{ marginTop: '1rem' }}>
        <button type="button" onClick={() => void runRegister()} disabled={disabled}>
          Register
        </button>
      </div>
    </div>
  )
}
