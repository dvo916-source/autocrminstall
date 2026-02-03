# Tutorial: Gerando seu Token do GitHub (GH_TOKEN)

Como o processo de publicação é automático, o GitHub exige uma "chave mestra" (Token) para permitir que o script envie os arquivos. Siga estes passos simples:

### Passo 1: Acessar as Configurações
1. Entre no seu GitHub: [github.com](https://github.com/)
2. No canto superior direito, clique na sua **foto de perfil**.
3. Clique em **Settings** (Configurações).

### Passo 2: Ir para o Menu de Desenvolvedor
1. No menu da esquerda, role tudo até o final.
2. Clique no último item: **<> Developer settings**.

### Passo 3: Criar o Token Classic
1. Clique em **Personal access tokens**.
2. Clique em **Tokens (classic)**.
3. Clique no botão azul **Generate new token** e escolha **Generate new token (classic)**.

### Passo 4: Configurar a Chave
1. **Note:** Dê um nome, ex: `SDR_PUBLISH`.
2. **Expiration:** Escolha `No expiration` (ou a data que preferir).
3. **Select scopes (O mais importante):**
   - [x] **repo** (Marque esta primeira caixa. Ela marcará todas as sub-caixas de repositório).
4. Role até o fim da página e clique em **Generate token**.

### Passo 5: Salvar e Configurar no Windows
> [!IMPORTANT]
> **COPIE O TOKEN AGORA!** Ele começa com `ghp_...`. Você só verá esse código uma vez.

1. Abra o **PowerShell** ou **Prompt de Comando** no seu Windows.
2. Digite o seguinte comando (substituindo pelo seu token):
   ```powershell
   setx GH_TOKEN "seu_token_aqui"
   ```
3. **Reinicie seu Computador**. Isso é necessário para que todos os programas (incluindo o VS Code) vejam a nova chave.

---

### Como testar se funcionou?
Após reiniciar, abra o terminal e digite:
`echo %GH_TOKEN%` (no CMD) ou `$env:GH_TOKEN` (no PowerShell).
Se aparecer o seu token, você já pode rodar o `PUBLISH.bat`!
