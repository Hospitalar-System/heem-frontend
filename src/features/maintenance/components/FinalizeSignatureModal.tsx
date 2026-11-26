import { CheckCircle2 } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { newClientId, SignatureImageError, signatureErrorMessage, useRegisterSignature } from '../api/signatures'
import type { SignatureRole, SignatureTarget } from '../types/signatures'
import { SignatureCanvas, type SignatureCanvasHandle } from './SignatureCanvas'

type Step = 'tecnico' | 'responsavel'

const fieldClass = 'h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
const primaryButton = 'h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton = 'h-9 rounded-md border border-border px-3 text-xs font-medium text-text-secondary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Tela "Finalizar" (Epic 22, web): assinatura obrigatória do técnico e, em seguida, a do responsável do hospital
 * (opcional, nome e cargo, no mesmo aparelho). Quando o técnico já assinou, abre direto no passo do responsável.
 * Nenhum texto afirma validade jurídica da assinatura.
 */
export function FinalizeSignatureModal({ target, title, description, technicianSigned = false, onClose }: {
  target: SignatureTarget
  title: string
  description: string
  technicianSigned?: boolean
  onClose: () => void
}) {
  const register = useRegisterSignature(target)
  const [step, setStep] = useState<Step>(technicianSigned ? 'responsavel' : 'tecnico')
  const [empty, setEmpty] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Erro da própria imagem (vazia ou acima de 200 KB): marca a área de assinatura, além da mensagem.
  const [imageError, setImageError] = useState(false)
  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState('')
  const canvasRef = useRef<SignatureCanvasHandle>(null)
  // Um clientId por assinatura: o reenvio depois de uma falha não duplica o registro.
  const clientIds = useRef<Record<Step, string>>({ tecnico: newClientId(), responsavel: newClientId() })

  async function submit(event: FormEvent<HTMLFormElement>, papel: SignatureRole) {
    event.preventDefault()
    setError(null)
    setImageError(false)
    const imagem = await canvasRef.current?.toBlob()
    if (!imagem) { setError('Desenhe a assinatura antes de registrar.'); setImageError(true); return }
    try {
      await register.mutateAsync({
        papel, imagem, clientId: clientIds.current[step], assinadoEm: new Date().toISOString(),
        ...(papel === 'responsavel_hospital' ? { nome, cargo } : {}),
      })
      if (papel === 'tecnico') {
        toast.success('Assinatura do técnico registrada.')
        setStep('responsavel')
        setEmpty(true)
      } else {
        toast.success('Assinatura do responsável registrada.')
        onClose()
      }
    } catch (failure) {
      setError(signatureErrorMessage(failure))
      setImageError(failure instanceof SignatureImageError)
    }
  }

  const pending = register.isPending
  const steps = <ol aria-label="Etapas da finalização" className="mb-4 flex items-center gap-2 text-[11px] font-medium">
    <li className={`flex items-center gap-1.5 ${step === 'tecnico' ? 'text-primary' : 'text-text-secondary'}`}>{step === 'responsavel' ? <CheckCircle2 aria-hidden="true" size={14} className="text-primary" /> : <span aria-hidden="true" className="grid size-4 place-items-center rounded-full bg-primary text-[10px] text-bg-brand">1</span>}Técnico{step === 'responsavel' ? <span className="sr-only"> (assinado)</span> : null}</li>
    <li aria-hidden="true" className="h-px flex-1 bg-border" />
    <li className={`flex items-center gap-1.5 ${step === 'responsavel' ? 'text-primary' : 'text-text-muted'}`}><span aria-hidden="true" className={`grid size-4 place-items-center rounded-full text-[10px] ${step === 'responsavel' ? 'bg-primary text-bg-brand' : 'border border-border'}`}>2</span>Responsável do hospital (opcional)</li>
  </ol>

  return <Modal title={title} description={description} busy={pending} onClose={onClose}>
    {steps}
    {step === 'tecnico' ? <form key="tecnico" className="space-y-4" onSubmit={(event) => void submit(event, 'tecnico')}>
      <p className="text-xs leading-5 text-text-secondary">Assine como técnico responsável. O nome e o registro profissional (CREA) vêm do seu cadastro.</p>
      <SignatureCanvas ref={canvasRef} label="Assinatura do técnico" onChange={(next) => { setEmpty(next); if (!next) setImageError(false) }} disabled={pending} errorId={imageError ? 'signature-error' : undefined} />
      {error && <p id="signature-error" role="alert" className="text-xs text-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <button type="button" disabled={pending} onClick={onClose} className={secondaryButton}>Assinar depois</button>
        <button type="submit" disabled={pending || empty} className={primaryButton}>{pending ? 'Registrando…' : 'Registrar assinatura'}</button>
      </div>
    </form> : <form key="responsavel" className="space-y-4" onSubmit={(event) => void submit(event, 'responsavel_hospital')}>
      <p className="text-xs leading-5 text-text-secondary">Se alguém da equipe do hospital acompanhou o atendimento, pode assinar agora, neste aparelho.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Nome do responsável<input required maxLength={150} autoComplete="off" value={nome} onChange={(event) => setNome(event.target.value)} disabled={pending} className={fieldClass} /></label>
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Cargo<input required maxLength={100} autoComplete="off" value={cargo} onChange={(event) => setCargo(event.target.value)} placeholder="Ex.: Coordenadora de enfermagem" disabled={pending} className={fieldClass} /></label>
      </div>
      <SignatureCanvas ref={canvasRef} label="Assinatura do responsável" onChange={(next) => { setEmpty(next); if (!next) setImageError(false) }} disabled={pending} errorId={imageError ? 'signature-error' : undefined} />
      {error && <p id="signature-error" role="alert" className="text-xs text-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <button type="button" disabled={pending} onClick={onClose} className={secondaryButton}>Pular</button>
        <button type="submit" disabled={pending || empty || !nome.trim() || !cargo.trim()} className={primaryButton}>{pending ? 'Registrando…' : 'Registrar assinatura'}</button>
      </div>
    </form>}
  </Modal>
}
