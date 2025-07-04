'use client'
import { useState, useTransition } from "react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"

export function CreateUserForm() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' })
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    
    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form)
        })
        
        const result = await response.json()
        
        if (result.success) {
          setFeedback('Usuario creado correctamente')
          setForm({ name: '', email: '', password: '', role: 'user' })
          setOpen(false)
          // Recargar la página para mostrar el nuevo usuario
          window.location.reload()
        } else {
          setFeedback(result.error || 'Error al crear usuario')
        }
      } catch (error) {
        setFeedback('Error de conexión')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="bg-primary text-white px-4 py-2 rounded">Crear usuario</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear nuevo usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input name="name" value={form.name} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña temporal</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rol</label>
            <select name="role" value={form.role} onChange={handleChange} className="w-full border rounded px-2 py-1">
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <DialogFooter>
            <button type="submit" className="bg-primary text-white px-4 py-2 rounded" disabled={isPending}>Crear</button>
            <DialogClose asChild>
              <button type="button" className="bg-muted px-4 py-2 rounded">Cancelar</button>
            </DialogClose>
          </DialogFooter>
          {feedback && <div className="text-sm text-destructive mt-2">{feedback}</div>}
        </form>
      </DialogContent>
    </Dialog>
  )
} 