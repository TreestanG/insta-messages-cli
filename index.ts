import { readdirSync } from 'fs';
import path from 'path'
import chalk from 'chalk'
import { Message, Messages } from './types';


let searchTerm: string = '' // search for a specific person
let firstXMessages = undefined // cut off the first x messages
let person = '' // highlight messages from person
let highlightPerson = false // toggle highlight
let saveToFile = false // save to file
let searchTermIndex = 0 // search between multiple files
let beforeDate: Date | undefined = undefined // search before a specific date
let afterDate: Date | undefined = undefined // search after a specific date
let contains = '' // search for a specific word in messages

let args = process.argv.slice(2)
args.forEach((arg, index) => {
    switch (arg) {
        case '-to':
            searchTerm = args[index + 1]
            break
        case '-first':
            firstXMessages = parseInt(args[index + 1])
            break
        case '-from':
            person = args[index + 1]
            break
        case '-h':
            highlightPerson = true
            break
        case '-save':
            saveToFile = true
            break
        case '-index':
            searchTermIndex = parseInt(args[index + 1])
            break
        case '-help':
            console.log(`
Instagram Messages CLI

Usage: node index.ts -flag option

-to <person>: search for a specific person (*required)
-first <number>: cut off the first x messages (default: all)
-from <person>: highlight messages from person (default: all members)
-h: toggle highlight (default: false)
-save: save to file (default: false)
-index <number>: search between multiple files (default: 0)
-before <date>: search before a specific date (default: none)
-after <date>: search after a specific date (default: none)
-contains <"words">: search for a specific word in messages (default: none)
            `)
            process.exit(0)
        case '-before':
            beforeDate = new Date(args[index + 1])
            break
        case '-after':
            afterDate = new Date(args[index + 1])
            break
        case "-contains":
            contains = args[index + 1]
            break
    }
})

let foundInboxDirs = readdirSync('./').filter(file => file.includes('inbox') || (file.includes("-001") && file.includes('inbox')))

if (foundInboxDirs.length === 0) {
    console.log('No inbox directories found. Inbox directories should include "inbox"')
    process.exit(0)
}

const inbox = readdirSync(path.join(__dirname, foundInboxDirs[0], 'inbox'))
const findJson = (name: string) => {
    const files = inbox.filter(file => file.includes(name))
    return files
}

const createMessageJson = (name: string) : [Messages, string[]] => {
    let jsonPaths = findJson(name)
    if (jsonPaths.length === 0) {
        console.log('No files found')
        process.exit(0)
    }
    if (searchTermIndex+1 > jsonPaths.length) {
        console.log('Index out of range')
        process.exit(0)
    }
    let filePath = path.join(__dirname, './inbox-20240812T070227Z-001/inbox', jsonPaths[searchTermIndex])

    const json_messages = readdirSync(filePath).filter(file => file.includes('message'))
    const message1 = require(path.join(filePath, json_messages[0]))

    for (let i = 1; i < json_messages.length; i++) {
        const message = require(path.join(filePath, json_messages[i]))
        message1.messages = message1.messages.concat(message.messages)
    }

    return [message1, findJson(name)]
}

let [messageJson, files] = createMessageJson(searchTerm)
let messages: Message[] = messageJson.messages

messages = messages.filter(message => message.content).filter(message => {

    const beforeCheck = beforeDate ? (new Date(message.timestamp_ms) < beforeDate) : true
    const afterCheck = afterDate ? (new Date(message.timestamp_ms) > afterDate) : true
    const dateCheck = beforeCheck && afterCheck
    const containCheck = contains.length > 0 ? message.content.toLowerCase().includes(contains.toLowerCase()) : true
    return dateCheck && containCheck

}).map(message => {
    return {
        ...message,
        content: Buffer.from(message.content, 'ascii').toString('utf8'),
        sender_name: Buffer.from(message.sender_name, 'ascii').toString('utf8')
    }
})

if (person.length > 0 && !highlightPerson) {
    messages = messages.filter(message => message.sender_name.toLowerCase().includes(person.toLowerCase()))
}

const sortedMessages = messages.sort((a, b) => a.timestamp_ms - b.timestamp_ms)

const participants = messageJson.participants.map(participant => participant.name)
const totalMessages = messages.length 
const messagePerParticipant = participants.map(participant => {
    const messages = sortedMessages.filter(message => message.sender_name === participant)
    return {
        participant,
        messages: messages.length
    }
})


sortedMessages.slice(0, !firstXMessages ? sortedMessages.length : firstXMessages).forEach(message => {
    let dateString = chalk.dim(`${new Date(message.timestamp_ms).toLocaleDateString()} ${new Date(message.timestamp_ms).toLocaleTimeString()}`)
    if (highlightPerson && message.sender_name.toLowerCase().includes(person.toLowerCase()) && person.length > 0) {
        console.log(`${dateString} ${chalk.magenta(message.sender_name)}: ${message.content}`)
    } else {
        console.log(`${dateString} ${message.sender_name}: ${message.content}`)
    }
})

if (saveToFile) {
    const fs = require('fs')
    fs.writeFileSync(`messages-${searchTerm}-${new Date().getTime()}.txt`, `
${sortedMessages.slice(0, !firstXMessages ? sortedMessages.length : firstXMessages).map(message => `${new Date(message.timestamp_ms).toLocaleDateString()} ${message.sender_name}: ${message.content}`).join('\n')}
    
Total Messages: ${totalMessages}
Participants: ${participants.join(', ')}
Messages per participant:
${messagePerParticipant.map(participant => `${participant.participant}: ${participant.messages}`).join('\n')}`)
}

console.log(`
${chalk.bgCyan(`Total messages: ${totalMessages}`)}
${chalk.green(`Participants: ${participants.join(', ')} `)}
${chalk.yellow(`Messages per participant: `)}
${messagePerParticipant.map(participant => {
    return (chalk.bold(`${participant.participant}: ${participant.messages}`))
}).join('\n')}
${contains.length > 0 ? chalk.dim(`Searching for messages containing: ${contains}`) : ''}
${chalk.dim(`These were the found inbox files: ${files.map(file => file.split('_')[0])} `)}
${chalk.dim(`Currently using the file: ${files[searchTermIndex]}`)}
`)



