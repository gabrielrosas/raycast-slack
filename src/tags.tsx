import { List, ActionPanel, Action, Icon, Color, useNavigation, Form } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { Tag, TAG_COLORS, getTags, saveTags, deleteTag } from "./common/tags";

function CreateTag({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string; color: string }) {
    const tags = await getTags();
    const tag: Tag = {
      id: Date.now().toString(),
      name: values.name.trim(),
      color: values.color as Color,
    };
    await saveTags([...tags, tag]);
    onCreated();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Tag" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="e.g. Work, Personal, Urgent..." />
      <Form.Dropdown id="color" title="Color" defaultValue={Color.Blue}>
        {TAG_COLORS.map((c) => (
          <Form.Dropdown.Item key={c.value} value={c.value} title={c.name} icon={{ source: Icon.Circle, tintColor: c.value }} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function EditTag({ tag, onEdited }: { tag: Tag; onEdited: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string; color: string }) {
    const tags = await getTags();
    const updated = tags.map((t) => (t.id === tag.id ? { ...t, name: values.name.trim(), color: values.color as Color } : t));
    await saveTags(updated);
    onEdited();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Tag" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={tag.name} />
      <Form.Dropdown id="color" title="Color" defaultValue={tag.color}>
        {TAG_COLORS.map((c) => (
          <Form.Dropdown.Item key={c.value} value={c.value} title={c.name} icon={{ source: Icon.Circle, tintColor: c.value }} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function Command() {
  const { data: tags, isLoading, revalidate } = usePromise(getTags);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => {
    setRefreshKey((k) => k + 1);
    revalidate();
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tags...">
      {tags?.map((tag) => (
        <List.Item
          key={tag.id + refreshKey}
          title={tag.name}
          icon={{ source: Icon.Tag, tintColor: tag.color }}
          actions={
            <ActionPanel>
              <Action.Push title="Edit Tag" icon={Icon.Pencil} target={<EditTag tag={tag} onEdited={refresh} />} />
              <Action
                title="Delete Tag"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={async () => {
                  await deleteTag(tag.id);
                  refresh();
                }}
              />
              <Action.Push title="Create Tag" icon={Icon.Plus} target={<CreateTag onCreated={refresh} />} shortcut={{ modifiers: ["cmd"], key: "n" }} />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && (!tags || tags.length === 0) && (
        <List.EmptyView
          title="No tags yet"
          description="Create your first tag"
          actions={
            <ActionPanel>
              <Action.Push title="Create Tag" icon={Icon.Plus} target={<CreateTag onCreated={refresh} />} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
