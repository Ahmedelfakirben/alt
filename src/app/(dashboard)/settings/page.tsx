"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { User, Building, Save, Loader2, ReceiptText } from "lucide-react"
import { toast } from "sonner"
import { useFiscalMode } from "@/providers/fiscal-mode-context"
import { Switch } from "@/components/ui/switch"

export default function SettingsPage() {
    const supabase = createClient()
    const { fiscalMode, toggleFiscalMode } = useFiscalMode()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [profile, setProfile] = useState({ nom: "", prenom: "", email: "", role: "" })
    const [company, setCompany] = useState({ nom: "ISH Digital ALT", adresse: "Casablanca, Maroc", telephone: "+212 5XX-XXXXXX", email: "contact@ish-digital.ma", ice: "000000000000000" })

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single() as any
                if (data) setProfile({ nom: data.nom, prenom: data.prenom, email: data.email, role: data.role })
            }
            setLoading(false)
        }
        loadProfile()
    }, [])

    const handleSaveProfile = async () => {
        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Non connecté")
            const { error } = await (supabase.from("profiles") as any).update({ nom: profile.nom, prenom: profile.prenom }).eq("user_id", user.id)
            if (error) throw error
            toast.success("Profil mis à jour")
        } catch { toast.error("Erreur lors de la sauvegarde") }
        setSaving(false)
    }

    const handleSaveCompany = () => {
        localStorage.setItem("company_info", JSON.stringify(company))
        toast.success("Informations société sauvegardées")
    }

    useEffect(() => {
        const saved = localStorage.getItem("company_info")
        if (saved) { try { setCompany(JSON.parse(saved)) } catch { } }
    }, [])

    const roleLabels: Record<string, string> = { admin: "Administrateur", gerant: "Gérant", commercial: "Commercial", magasinier: "Magasinier" }

    if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>

    return (
        <div className="space-y-6">
            <div><h2 className="text-3xl font-bold tracking-tight">Paramètres</h2><p className="text-muted-foreground">Gérez votre profil et les paramètres de l&apos;application</p></div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2"><User className="h-5 w-5" /><CardTitle>Profil utilisateur</CardTitle></div>
                    <CardDescription>Informations de votre compte</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div><Label>Nom</Label><Input value={profile.nom} onChange={(e) => setProfile({ ...profile, nom: e.target.value })} /></div>
                        <div><Label>Prénom</Label><Input value={profile.prenom} onChange={(e) => setProfile({ ...profile, prenom: e.target.value })} /></div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div><Label>Email</Label><Input value={profile.email} disabled className="bg-muted" /></div>
                        <div><Label>Rôle</Label><div className="mt-2"><Badge variant="outline">{roleLabels[profile.role] || profile.role}</Badge></div></div>
                    </div>
                    <Button onClick={handleSaveProfile} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Sauvegarder le profil</Button>
                </CardContent>
            </Card>

            <Separator />

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2"><Building className="h-5 w-5" /><CardTitle>Informations société</CardTitle></div>
                    <CardDescription>Ces informations apparaissent sur les documents PDF générés</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div><Label>Nom de la société</Label><Input value={company.nom} onChange={(e) => setCompany({ ...company, nom: e.target.value })} /></div>
                        <div><Label>ICE</Label><Input value={company.ice} onChange={(e) => setCompany({ ...company, ice: e.target.value })} /></div>
                    </div>
                    <div><Label>Adresse</Label><Input value={company.adresse} onChange={(e) => setCompany({ ...company, adresse: e.target.value })} /></div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div><Label>Téléphone</Label><Input value={company.telephone} onChange={(e) => setCompany({ ...company, telephone: e.target.value })} /></div>
                        <div><Label>Email</Label><Input value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} /></div>
                    </div>
                    <Button onClick={handleSaveCompany}><Save className="mr-2 h-4 w-4" />Sauvegarder les informations société</Button>
                </CardContent>
            </Card>



            <Separator />
            <AdminManagement profileEmail={profile.email} />
        </div>
    )
}

import { getAdminUsers, createAdminUser, deleteAdminUser } from "@/app/actions/users"
import { Trash2, ShieldAlert, Plus, RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function AdminManagement({ profileEmail }: { profileEmail: string }) {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingAction, setLoadingAction] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)

    const fetchUsers = async () => {
        setLoading(true)
        const res = await getAdminUsers()
        if (Array.isArray(res)) setUsers(res)
        setLoading(false)
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoadingAction(true)
        const formData = new FormData(e.currentTarget)
        const res = await createAdminUser(formData)
        
        if (res.error) toast.error(res.error)
        else {
            toast.success("Administrateur créé avec succès")
            setDialogOpen(false)
            fetchUsers()
        }
        setLoadingAction(false)
    }

    const handleDelete = async (id: string, email: string) => {
        if (email === profileEmail) {
            toast.error("Opération non permise: vous ne pouvez pas supprimer votre propre compte.")
            return
        }
        if (!confirm(`Tuer l'accès admin pour ${email} ?`)) return
        
        setLoadingAction(true)
        const res = await deleteAdminUser(id)
        if (res.error) toast.error(res.error)
        else {
            toast.success("Administrateur supprimé")
            fetchUsers()
        }
        setLoadingAction(false)
    }

    return (
        <Card className="border-orange-500/20">
            <CardHeader className="flex flex-row space-y-0 justify-between items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-orange-500" />
                        <CardTitle className="text-orange-500">Gestion des Administrateurs</CardTitle>
                    </div>
                    <CardDescription>Créez ou gérez les accès avec un pouvoir total sur le système</CardDescription>
                </div>
                
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="default" className="bg-orange-600 hover:bg-orange-700">
                            <Plus className="mr-2 h-4 w-4" /> Nouvel Admin
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ajouter un nouvel Administrateur</DialogTitle>
                            <DialogDescription>Générez un nouvel identifiant sécurisé pour un gestionnaire principal.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Nom</Label><Input name="nom" required /></div>
                                <div><Label>Prénom</Label><Input name="prenom" required /></div>
                            </div>
                            <div><Label>Email</Label><Input name="email" type="email" required /></div>
                            <div><Label>Mot de passe</Label><Input name="password" type="password" required minLength={6} /></div>
                            <DialogFooter>
                                <Button type="submit" disabled={loadingAction}>
                                    {loadingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Créer le compte
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center p-4"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom complet</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((u) => (
                                <TableRow key={u.id}>
                                    <TableCell className="font-medium">{u.nom} {u.prenom}</TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => handleDelete(u.id, u.email)}
                                            disabled={loadingAction || u.email === profileEmail}
                                            className={u.email === profileEmail ? "opacity-30" : "text-red-500 hover:text-red-700 hover:bg-red-100"}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users.length === 0 && (
                                <TableRow><TableCell colSpan={3} className="text-center">Aucun autre administrateur trouvé.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}

