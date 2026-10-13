# Brazilian Releases-Regex — starter

Primeira implementação para criar uma variante brasileira de [Vidhin05/Releases-Regex](https://github.com/Vidhin05/Releases-Regex), usando `English` como base e os grupos de [TRaSH Guides PT-BR](https://github.com/marcosviniciusi/trash-guides-ptbr/tree/stable) como fonte.

## O que o gerador faz

- Baixa `English/regexes.json`, `English/expressions.json` e `all-templates.json` do projeto original.
- Importa as listas de grupos de Dual Audio, dublagem, legendas e grupos problemáticos da branch `stable` do TRaSH Guides PT-BR.
- Mantém a base de pontuação English e acrescenta regexes específicas para reconhecer as listas brasileiras e os marcadores `DUAL`/dublado.
- Cria uma penalidade forte para os quatro grupos que a fonte classifica explicitamente como problemáticos.
- Atualiza `all-templates.json` com uma variante `Brazilian` que sincroniza `Brazilian/regexes.json` e `Brazilian/expressions.json`.
- Gera `Brazilian/source-audit.json`, com quantidades e URLs usadas.

## Por que os grupos ainda não têm tiers próprios

Na branch `stable` consultada, cada uma das três listas (`dual-audio`, `dubbed`, `subtitles`) tem 451 especificações de grupo e a mesma lista de grupos. O arquivo `bad` tem quatro grupos adicionais. Portanto, a fonte oferece um conjunto de grupos reconhecidos e uma lista explicitamente problemática, mas **não estabelece níveis de qualidade diferentes entre os 451 grupos**. Este primeiro passo não inventa uma classificação baseada na ordem dos itens.

As expressões para o conjunto reconhecido e para os marcadores são neutras (score `0`) nesta versão inicial; isso mantém os nomes visíveis para depuração sem alterar a ordenação. Os quatro grupos de `Brazilian Group Tier Bad` recebem `-35000`, seguindo a escala de penalidade usada pela base English para grupos de baixa qualidade. Essa escolha deve ser revista com testes e preferência pessoal antes de ser considerada definitiva.

### English rules intentionally not inherited

The Brazilian variant omits the upstream English `Radarr Bad Dual Groups` and `Sonarr Bad Dual Groups` patterns and their `Bad Dual` ranked expressions. Those rules penalize a specific audio-track/language-ordering behavior; they are not general quality tiers for groups such as BiOMA or CYPHER. The Brazilian variant instead uses the four groups explicitly listed by TRaSH Guides PT-BR as problematic.

## Requisitos

- Node.js 20 ou superior.
- Acesso à internet para consultar os repositórios upstream.

## Gerar os arquivos

1. Descompacte o pacote.
2. No diretório do projeto, execute:

   ```bash
   npm test
   npm run build -- --base-url https://raw.githubusercontent.com/SEU_USUARIO/SEU_REPOSITORIO/main
   ```

3. O gerador cria:

   ```text
   Brazilian/regexes.json
   Brazilian/expressions.json
   Brazilian/source-audit.json
   all-templates.json
   ```

Substitua `SEU_USUARIO/SEU_REPOSITORIO` pelo repositório público onde os arquivos serão publicados. `all-templates.json` só funcionará para outros usuários depois que as URLs forem reais e acessíveis.

## Testes e validação

O comando `npm test` testa a normalização dos padrões, composição de grupos, cabeçalhos e criação da variante de template usando fixtures locais. Depois de rodar o build, confira os grupos e títulos usados pelo seu próprio provedor no AIOStreams. Os títulos do guia brasileiro são exemplos de validação, não prova de que todas as streams usem uma convenção uniforme.

## Fontes e atribuição

- Projeto base: https://github.com/Vidhin05/Releases-Regex
- Fonte de grupos (branch `stable`): https://github.com/marcosviniciusi/trash-guides-ptbr/tree/stable
- Guia de nomenclatura fornecido para esta tarefa: usado como referência para testes de títulos com um ou dois grupos e tags `DUAL`.

Os repositórios upstream consultados não apresentavam um arquivo de licença na árvore pública examinada. Antes de publicar uma cópia derivada completa de `English`, verifique as condições de reutilização com os mantenedores e preserve a atribuição apropriada. O script deste pacote baixa os arquivos upstream no momento da geração, em vez de redistribuir cópias estáticas deles no starter.

## Escopo desta primeira versão

A finalidade é uma base reproduzível e compatível com o formato existente, não uma pontuação final de qualidade brasileira. O passo seguinte deve definir se os grupos reconhecidos serão todos equivalentes ou se haverá tiers manuais fundamentados em critérios e releases de teste.
