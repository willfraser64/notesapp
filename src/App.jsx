import { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

import {
  Authenticator,
  Button,
  Flex,
  Heading,
  Image,
  Text,
  TextField,
  View
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import { generateClient } from 'aws-amplify/data';
import { getUrl, uploadData, remove } from 'aws-amplify/storage';

Amplify.configure(outputs);

const client = generateClient();

function App() {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const { data } = await client.models.Note.list();
    const withUrls = await Promise.all(
      data.map(async (note) => {
        if (note.image) {
          const { url } = await getUrl({ path: note.image });
          return { ...note, imageUrl: url.toString() };
        }
        return note;
      })
    );
    setNotes(withUrls);
  }

  async function createNote(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = form.get('name');
    const description = form.get('description');
    const file = form.get('image');
    let imagePath = '';

    if (file && file.name) {
      const result = await uploadData({
        data: file,
        // Matches storage rule "media/{entity_id}/*"
        path: ({ identityId }) => `media/${identityId}/${file.name}`,
      }).result;
      imagePath = result.path;
    }

    await client.models.Note.create({
      name,
      description,
      image: imagePath,
    });

    event.currentTarget.reset();
    await fetchNotes();
  }

  async function deleteNote(note) {
    if (note.image) {
      try {
        await remove({ path: note.image });
      } catch {
        // ignore missing file errors
      }
    }
    await client.models.Note.delete({ id: note.id });
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
  }

  return (
    <Authenticator>
      {({ signOut }) => (
        <View className="App">
          <Heading level={1}>My Notes App</Heading>

          <View as="form" margin="1rem 0" onSubmit={createNote}>
            <Flex direction="row" gap="0.5rem" wrap="wrap" alignItems="flex-end">
              <TextField
                name="name"
                placeholder="Note Name"
                label="Note Name"
                labelHidden
                required
              />
              <TextField
                name="description"
                placeholder="Note Description"
                label="Note Description"
                labelHidden
                required
              />
              <View as="input" name="image" type="file" />
              <Button type="submit" variation="primary">Create Note</Button>
            </Flex>
          </View>

          <Heading level={2}>Current Notes</Heading>
          <View margin="1rem 0">
            {notes.map((note) => (
              <Flex key={note.id} direction="column" className="box" padding="0.5rem" gap="0.25rem">
                <Text as="strong">{note.name}</Text>
                <Text as="span">{note.description}</Text>
                {note.imageUrl && (
                  <Image
                    src={note.imageUrl}
                    alt={`visual for ${note.name}`}
                    style={{ width: 400 }}
                  />
                )}
                <Button variation="link" onClick={() => deleteNote(note)}>Delete note</Button>
              </Flex>
            ))}
          </View>

          <Button onClick={signOut}>Sign out</Button>
        </View>
      )}
    </Authenticator>
  );
}

export default App;
