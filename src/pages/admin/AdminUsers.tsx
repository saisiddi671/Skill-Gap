import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Shield, Pencil, Trash2, UserCog, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  is_approved: boolean;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

const AdminUsers = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", phone: "", bio: "" });
  const [saving, setSaving] = useState(false);

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleUser, setRoleUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState("student");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    try {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, user_id, full_name, email, phone, bio, is_approved, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      setProfiles(profilesRes.data || []);
      const roleMap = new Map<string, string>();
      (rolesRes.data || []).forEach((r: UserRole) => roleMap.set(r.user_id, r.role));
      setRoles(roleMap);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleApprove = async (profile: UserProfile) => {
    try {
      const { error } = await supabase.from("profiles").update({ is_approved: true }).eq("id", profile.id);
      if (error) throw error;
      toast({ title: `${profile.full_name || profile.email} approved successfully` });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error approving user", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async (profile: UserProfile) => {
    try {
      const { error } = await supabase.from("profiles").update({ is_approved: false }).eq("id", profile.id);
      if (error) throw error;
      toast({ title: `${profile.full_name || profile.email} access revoked` });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error revoking access", description: error.message, variant: "destructive" });
    }
  };

  const openEdit = (profile: UserProfile) => {
    setEditingUser(profile);
    setEditForm({ full_name: profile.full_name || "", email: profile.email || "", phone: profile.phone || "", bio: profile.bio || "" });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: editForm.full_name || null,
        email: editForm.email || null,
        phone: editForm.phone || null,
        bio: editForm.bio || null,
      }).eq("id", editingUser.id);
      if (error) throw error;
      toast({ title: "User profile updated successfully" });
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error updating user", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openRoleDialog = (profile: UserProfile) => {
    setRoleUser(profile);
    setSelectedRole(roles.get(profile.user_id) || "student");
    setRoleDialogOpen(true);
  };

  const handleRoleSave = async () => {
    if (!roleUser) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("user_roles").update({ role: selectedRole as "admin" | "student" }).eq("user_id", roleUser.user_id);
      if (error) throw error;
      toast({ title: `Role updated to ${selectedRole}` });
      setRoleDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error updating role", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (profile: UserProfile) => {
    setDeletingUser(profile);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", deletingUser.id);
      if (error) throw error;
      toast({ title: "User profile deleted" });
      setDeleteDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error deleting user", description: error.message, variant: "destructive" });
    }
  };

  const isSelf = (profile: UserProfile) => profile.user_id === currentUser?.id;

  const pendingUsers = profiles.filter((p) => !p.is_approved);
  const approvedUsers = profiles.filter((p) => p.is_approved);

  const renderUserTable = (userList: UserProfile[], showApprovalActions: boolean) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-[180px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {userList.map((profile) => {
            const userRole = roles.get(profile.user_id) || "student";
            return (
              <TableRow key={profile.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {profile.full_name || "—"}
                    {isSelf(profile) && <Badge variant="outline" className="text-xs">You</Badge>}
                  </div>
                </TableCell>
                <TableCell>{profile.email || "—"}</TableCell>
                <TableCell>
                  <Badge variant={userRole === "admin" ? "default" : "secondary"} className="gap-1">
                    {userRole === "admin" && <Shield className="h-3 w-3" />}
                    {userRole}
                  </Badge>
                </TableCell>
                <TableCell>
                  {profile.is_approved || userRole === "admin" ? (
                    <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      <CheckCircle className="h-3 w-3" />
                      Approved
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(profile.created_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {showApprovalActions && !isSelf(profile) && (
                      <Button variant="default" size="sm" className="gap-1 h-8" onClick={() => handleApprove(profile)}>
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                    )}
                    {!showApprovalActions && profile.is_approved && !isSelf(profile) && userRole !== "admin" && (
                      <Button variant="outline" size="icon" title="Revoke access" className="h-8 w-8" onClick={() => handleReject(profile)}>
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" title="Edit profile" className="h-8 w-8" onClick={() => openEdit(profile)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Change role" className="h-8 w-8" onClick={() => openRoleDialog(profile)}>
                      <UserCog className="h-4 w-4" />
                    </Button>
                    {!isSelf(profile) && (
                      <Button variant="ghost" size="icon" title="Delete user" className="h-8 w-8" onClick={() => openDeleteDialog(profile)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manage Users</h1>
          <p className="text-muted-foreground mt-1">Approve, edit, and manage user accounts and roles</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="pt-6 space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" />
                Pending Approval ({pendingUsers.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Approved ({approvedUsers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning" />
                    Pending Users ({pendingUsers.length})
                  </CardTitle>
                  <CardDescription>Users waiting for admin approval to access the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No pending users</h3>
                      <p className="text-muted-foreground">All users have been approved.</p>
                    </div>
                  ) : renderUserTable(pendingUsers, true)}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approved">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Approved Users ({approvedUsers.length})
                  </CardTitle>
                  <CardDescription>Users with full access to the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  {approvedUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <User className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No approved users</h3>
                      <p className="text-muted-foreground">Approve users from the Pending tab.</p>
                    </div>
                  ) : renderUserTable(approvedUsers, false)}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Edit Profile Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Profile</DialogTitle>
              <DialogDescription>Update the user's profile information.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label htmlFor="edit-name">Full Name</Label><Input id="edit-name" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
              <div><Label htmlFor="edit-email">Email</Label><Input id="edit-email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div><Label htmlFor="edit-phone">Phone</Label><Input id="edit-phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
              <div><Label htmlFor="edit-bio">Bio</Label><Input id="edit-bio" value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleEditSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Role Dialog */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>Update role for <strong>{roleUser?.full_name || roleUser?.email}</strong></DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleRoleSave} disabled={saving}>{saving ? "Saving..." : "Update Role"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User Profile</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the profile for <strong>{deletingUser?.full_name || deletingUser?.email}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
