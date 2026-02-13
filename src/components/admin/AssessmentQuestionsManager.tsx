import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, ListChecks, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  assessment_id: string;
  question_text: string;
  question_type: string | null;
  options: { label: string; value: string }[] | null;
  correct_answer: string | null;
  points: number | null;
  order_index: number | null;
  code_template: string | null;
  language: string | null;
  expected_output: string | null;
  test_cases: any;
  created_at: string;
}

interface Props {
  assessmentId: string;
  assessmentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyForm = {
  question_text: "",
  question_type: "mcq",
  options: [
    { label: "A", value: "" },
    { label: "B", value: "" },
    { label: "C", value: "" },
    { label: "D", value: "" },
  ],
  correct_answer: "",
  points: "1",
  order_index: "0",
};

const AssessmentQuestionsManager = ({ assessmentId, assessmentTitle, open, onOpenChange }: Props) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("order_index", { ascending: true });

    if (error) {
      toast({ title: "Error loading questions", description: error.message, variant: "destructive" });
    }
    setQuestions((data as unknown as Question[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchQuestions();
  }, [open, assessmentId]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      order_index: String(questions.length),
    });
    setFormOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditing(q);
    const opts = Array.isArray(q.options)
      ? (q.options as { label: string; value: string }[])
      : [
          { label: "A", value: "" },
          { label: "B", value: "" },
          { label: "C", value: "" },
          { label: "D", value: "" },
        ];
    setForm({
      question_text: q.question_text,
      question_type: q.question_type || "mcq",
      options: opts,
      correct_answer: q.correct_answer || "",
      points: String(q.points || 1),
      order_index: String(q.order_index || 0),
    });
    setFormOpen(true);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...form.options];
    newOptions[index] = { ...newOptions[index], value };
    setForm({ ...form, options: newOptions });
  };

  const addOption = () => {
    const nextLabel = String.fromCharCode(65 + form.options.length);
    setForm({ ...form, options: [...form.options, { label: nextLabel, value: "" }] });
  };

  const removeOption = (index: number) => {
    if (form.options.length <= 2) return;
    const newOptions = form.options
      .filter((_, i) => i !== index)
      .map((opt, i) => ({ ...opt, label: String.fromCharCode(65 + i) }));
    // Reset correct answer if removed option was selected
    const removedLabel = form.options[index].label;
    const newCorrect = form.correct_answer === removedLabel ? "" : form.correct_answer;
    setForm({ ...form, options: newOptions, correct_answer: newCorrect });
  };

  const handleSave = async () => {
    if (!form.question_text.trim()) {
      toast({ title: "Question text is required", variant: "destructive" });
      return;
    }
    if (!form.correct_answer) {
      toast({ title: "Please select the correct answer", variant: "destructive" });
      return;
    }
    const emptyOptions = form.options.filter((o) => !o.value.trim());
    if (emptyOptions.length > 0) {
      toast({ title: "All options must have text", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        assessment_id: assessmentId,
        question_text: form.question_text.trim(),
        question_type: form.question_type,
        options: form.options as unknown as any,
        correct_answer: form.correct_answer,
        points: parseInt(form.points) || 1,
        order_index: parseInt(form.order_index) || 0,
      };

      if (editing) {
        const { error } = await supabase.from("assessment_questions").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Question updated" });
      } else {
        const { error } = await supabase.from("assessment_questions").insert(payload);
        if (error) throw error;
        toast({ title: "Question added" });
      }
      setFormOpen(false);
      fetchQuestions();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("assessment_questions").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Question deleted" });
      fetchQuestions();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Questions — {assessmentTitle}
          </DialogTitle>
          <DialogDescription>
            Manage multiple-choice questions for this assessment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreate} size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Add Question
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ListChecks className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No questions yet. Add your first question.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead>Answer</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((q, idx) => {
                  const opts = Array.isArray(q.options) ? (q.options as { label: string; value: string }[]) : [];
                  return (
                    <TableRow key={q.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">{q.question_text}</TableCell>
                      <TableCell>{opts.length} choices</TableCell>
                      <TableCell>
                        <Badge variant="outline">{q.correct_answer}</Badge>
                      </TableCell>
                      <TableCell>{q.points || 1}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(q)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Add / Edit Question Sub-Dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Question" : "Add Question"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update the question details." : "Create a new multiple-choice question."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Question Text</Label>
                <Textarea
                  value={form.question_text}
                  onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                  placeholder="Enter your question..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Points</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.points}
                  onChange={(e) => setForm({ ...form, points: e.target.value })}
                />
              </div>

              <div>
                <Label>Order Index</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.order_index}
                  onChange={(e) => setForm({ ...form, order_index: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Answer Choices</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOption} className="gap-1">
                    <Plus className="h-3 w-3" /> Add Option
                  </Button>
                </div>
                {form.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Badge variant="secondary" className="w-8 justify-center shrink-0">
                      {opt.label}
                    </Badge>
                    <Input
                      value={opt.value}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      placeholder={`Option ${opt.label}`}
                      className="flex-1"
                    />
                    {form.options.length > 2 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(idx)} className="shrink-0">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <Label>Correct Answer</Label>
                <Select value={form.correct_answer} onValueChange={(v) => setForm({ ...form, correct_answer: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    {form.options.map((opt) => (
                      <SelectItem key={opt.label} value={opt.label}>
                        {opt.label}: {opt.value || "(empty)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.question_text.trim()}>
                {saving ? "Saving..." : editing ? "Update" : "Add Question"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default AssessmentQuestionsManager;
