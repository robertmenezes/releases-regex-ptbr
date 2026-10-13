# Auditoria preliminar das fontes

## Estrutura Releases-Regex

| Arquivo | Itens na versão consultada | SHA do blob consultado |
|---|---:|---|
| `English/regexes.json` | 177 | `fcb4c0ceb6519797f5f27dba56fe6356948bfb09` |
| `English/expressions.json` | 249 | `d3374a34673db69adfee8f6e815cc405646b4503` |
| `German/regexes.json` | 214 | `f609e735ea9b5dd7344ce783da9f49e0457d3ac9` |
| `German/expressions.json` | 289 | `33915a309bb72b19a182401b35a9e434c0a3fe07` |

A comparação mostrou que `German` mantém a estrutura base e acrescenta regras específicas para idioma, releases DE, tiers de Remux/Blu-ray/Web, anime, grupos problemáticos e conteúdo dublado/legendado em alemão.

## Grupos TRaSH Guides PT-BR

| Arquivo | Especificações totais | Release groups |
|---|---:|---:|
| `custom-brazilian-group-tier-dual-audio.json` | 452 | 451 |
| `custom-brazilian-group-tier-dubbed.json` | 453 | 451 |
| `custom-brazilian-group-tier-subtitles.json` | 452 | 451 |
| `custom-brazilian-group-tier-bad.json` | 4 | 4 |

As listas principais têm o mesmo conjunto de 451 grupos na versão consultada. Os quatro grupos da lista `bad` são `ASM`, `DRENAN`, `CaNNIBal` e `S74Ll10n`, não presentes nos três conjuntos principais consultados.

## Implicação

Não é correto distribuir os 451 grupos em tiers por ordem de arquivo: a fonte não estabelece esse ranqueamento. A primeira versão mantém a pontuação English geral e registra os grupos brasileiros conhecidos de forma neutra; apenas a lista explicitamente classificada como problemática recebe uma penalidade provisória.
