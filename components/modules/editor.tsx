"use client";

import { useCallback, useState } from "react";
import { Trash2 } from "lucide-react";
import type { AppData, CollectionKey, ModuleKey } from "@/types";
import { useStore } from "@/lib/store";
import { MODULES } from "@/lib/modules";
import { remainingBalance } from "@/lib/calculations";
import { useFormatMoney } from "@/components/ui/money";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FORM_ID } from "@/components/modules/shared/form-kit";
import { IncomeForm } from "@/components/modules/income/form";
import { PayableForm } from "@/components/modules/payables/form";
import { ResponsibilityForm } from "@/components/modules/responsibilities/form";
import { ExpenseForm } from "@/components/modules/expenses/form";
import { SavingsForm } from "@/components/modules/savings/form";
import { InvestmentForm } from "@/components/modules/investments/form";
import { PlanningForm } from "@/components/modules/planning/form";
import { AssetForm } from "@/components/modules/assets/form";
import { ClientForm } from "@/components/modules/clients/form";

export const COLLECTION: Record<ModuleKey, CollectionKey> = {
  clients: "clients",
  income: "incomes",
  payables: "payables",
  responsibilities: "responsibilities",
  expenses: "expenses",
  savings: "savings",
  investments: "investments",
  planning: "wishlist",
  assets: "assets",
};

const FORMS = {
  clients: ClientForm,
  income: IncomeForm,
  payables: PayableForm,
  responsibilities: ResponsibilityForm,
  expenses: ExpenseForm,
  savings: SavingsForm,
  investments: InvestmentForm,
  planning: PlanningForm,
  assets: AssetForm,
} as const;

export function Editor() {
  const { editor, closeEditor, upsert, remove, toast, data, month } = useStore();
  const [valid, setValid] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const onValidChange = useCallback((v: boolean) => setValid(v), []);
  const fmt = useFormatMoney();

  const open = editor !== null;
  const meta = editor ? MODULES[editor.module] : null;
  const isEdit = Boolean(editor?.item);

  const handleSubmit = (item: { id: string }) => {
    if (!editor) return;
    const key = COLLECTION[editor.module];
    upsert(key, item as never);
    const list = data[key] as { id: string }[];
    const projected = {
      ...data,
      [key]: list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item],
    } as AppData;
    const left = remainingBalance(projected, month);
    if (left < 0) {
      toast(`Heads up: you're ${fmt(Math.abs(left))} over this month.`, "warning");
    } else {
      toast(isEdit ? "Changes saved" : `${meta?.singular} added`, "success");
    }
    setConfirmDelete(false);
    closeEditor();
  };

  const handleDelete = () => {
    if (!editor?.item) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    remove(COLLECTION[editor.module], editor.item.id);
    toast(`${meta?.singular} deleted`);
    setConfirmDelete(false);
    closeEditor();
  };

  const Form = editor ? FORMS[editor.module] : null;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setConfirmDelete(false);
          closeEditor();
        }
      }}
      title={meta ? `${isEdit ? "Edit" : "New"} ${meta.singular.toLowerCase()}` : ""}
      description={meta?.description}
      footer={
        <div className="flex items-center gap-3">
          {isEdit ? (
            <Button type="button" variant={confirmDelete ? "danger" : "ghost"} onClick={handleDelete} className={confirmDelete ? "" : "text-payable hover:text-payable"}>
              <Trash2 aria-hidden />
              {confirmDelete ? "Tap again to delete" : "Delete"}
            </Button>
          ) : null}
          <Button type="submit" form={FORM_ID} disabled={!valid} className="ml-auto min-w-32 flex-1 sm:flex-none">
            {isEdit ? "Save changes" : "Add"}
          </Button>
        </div>
      }
    >
      {Form && editor ? (
        <Form
          key={editor.item?.id ?? `${editor.module}-new`}
          item={editor.item as never}
          preset={editor.preset}
          onSubmit={handleSubmit as never}
          onValidChange={onValidChange}
        />
      ) : null}
    </Sheet>
  );
}
