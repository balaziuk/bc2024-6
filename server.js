const { program } = require('commander');
const express = require('express');
const path = require('path');
const multer = require('multer');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// налаштування Swagger
const options = {
  definition: {
    openapi: '3.0.0',  
    info: {
      title: 'Notes API',  
      version: '1.0.0',  
      description: 'API для роботи з нотатками',  
    },
  },
  apis: ['./server.js'],  //  місце, де Swagger буде шукати коментарі
};

const specs = swaggerJsdoc(options);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));  // Налаштування Swagger UI

const upload = multer();

program
    .requiredOption('-h, --host <host>', 'server address')
    .requiredOption('-p, --port <port>', 'server port')
    .requiredOption('-c, --cache <cache>', 'path to the cache');
program.parse(process.argv);

const { host, port, cache } = program.opts();

if (!host || !port || !cache) {
    console.error('All options -h, -p, -c are necessary!');
    process.exit(1);
}

// Масив для зберігання нотаток
let notes = [];

app.get('/', (req, res) => {
    res.redirect('/UploadForm.html');
});

/**
 * @swagger
 * /notes/{name}:
 *   get:
 *     summary: Отримати нотатку за ім'ям
 *     description: Повертає текст нотатки за її іменем
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         description: Ім'я нотатки
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Успішно знайдено нотатку
 *       404:
 *         description: Нотатку не знайдено
 */
app.get('/notes/:name', (req, res) => {
    const noteName = req.params.name;
    const note = notes.find(note => note.name === noteName);
    if (!note) {
        return res.status(404).send('Not found');
    }
    return res.send(note.text);
});

/**
 * @swagger
 * /notes/{name}:
 *   put:
 *     summary: Оновити текст нотатки
 *     description: Оновлює текст нотатки за її іменем
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         description: Ім'я нотатки для оновлення
 *         schema:
 *           type: string
 *       - in: body
 *         name: text
 *         required: true
 *         description: Новий текст нотатки
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Нотатку успішно оновлено
 *       404:
 *         description: Нотатку не знайдено
 */
app.put('/notes/:name', express.text(), (req, res) => {
    const noteName = req.params.name;
    const newText = req.body;

    const note = notes.find(n => n.name === noteName);
    if (!note) {
        return res.status(404).send('Not found');
    }

    note.text = newText;
    return res.send(note);
});

/**
 * @swagger
 * /notes/{name}:
 *   delete:
 *     summary: Видалити нотатку
 *     description: Видаляє нотатку за її іменем
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         description: Ім'я нотатки
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Нотатку успішно видалено
 *       404:
 *         description: Нотатку не знайдено
 */
app.delete('/notes/:name', (req, res) => {
    const noteName = req.params.name;
    const noteIndex = notes.findIndex(note => note.name === noteName);
    if (noteIndex === -1) {
        return res.status(404).send('Not found');
    }
    notes.splice(noteIndex, 1);
    return res.status(204).send();
});

/**
 * @swagger
 * /notes:
 *   get:
 *     summary: Отримати список всіх нотаток
 *     description: Повертає список всіх нотаток
 *     responses:
 *       200:
 *         description: Список нотаток успішно отримано
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   text:
 *                     type: string
 */
app.get('/notes', (req, res) => {
    return res.status(200).json(notes);
});

/**
 * @swagger
 * /write:
 *   post:
 *     summary: Створити нову нотатку
 *     description: Створює нову нотатку
 *     parameters:
 *       - in: formData
 *         name: note_name
 *         required: true
 *         schema:
 *           type: string
 *       - in: formData
 *         name: note
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Нотатку успішно створено
 *       400:
 *         description: Не вистачає необхідних параметрів
 */
app.post('/write', upload.none(), (req, res) => {
    const { note_name, note } = req.body;

    if (!note_name || !note) {
        return res.status(400).send('Note name and text are required');
    }

    const existingNote = notes.find(n => n.name === note_name);
    if (existingNote) {
        return res.status(400).send('Bad Request');
    }

    notes.push({ name: note_name, text: note });
    return res.status(201).send('Created');
});

// Статичний файл для HTML форми
app.use(express.static(path.join(__dirname, 'public')));

/**
 * @swagger
 * /UploadForm.html:
 *   get:
 *     summary: Отримати HTML-форму
 *     description: Повертає HTML-форму для завантаження нотаток
 *     responses:
 *       200:
 *         description: Успішно повернуто HTML-форму
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "<html><head><title>Upload Form</title></head><body>...</body></html>"
 */
app.get('/UploadForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'UploadForm.html'));
});


// Запуск сервера
app.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});
