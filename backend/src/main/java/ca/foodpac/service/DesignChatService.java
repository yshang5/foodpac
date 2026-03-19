package ca.foodpac.service;

import ca.foodpac.client.OpenAiClient;
import ca.foodpac.dto.DesignMessageDto;
import ca.foodpac.dto.DesignSessionDto;
import ca.foodpac.entity.*;
import ca.foodpac.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class DesignChatService {

    private final DesignSessionRepository sessionRepo;
    private final DesignMessageRepository messageRepo;
    private final DesignResultRepository resultRepo;
    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final Pattern AUTO_GENERATE_PATTERN =
            Pattern.compile("\\[AUTO_GENERATE:(\\{.*?\\})\\]", Pattern.DOTALL);

    // ── System Prompts ─────────────────────────────────────────────────────────

    private static final String SYSTEM_PROMPT_EN = """
            You are a packaging design consultant for foodPac, helping restaurant owners \
            create custom eco-friendly food packaging.

            Your goal is to collect the following information through natural, friendly conversation:
            1. PRODUCT — What food will go in this packaging? (e.g. salad, burger, sushi, noodles)
            2. BRAND — What is the restaurant or brand name?
            3. STYLE — Design style preference (e.g. minimalist, vintage, playful, luxury, modern)
            4. COLORS — Preferred color scheme (e.g. earthy greens, bold reds, clean white & gold)
            5. LOGO — Do they have a logo? If yes, ask for a direct image URL

            Rules:
            - Ask ONE question at a time to keep the conversation natural
            - Be warm, encouraging, and concise
            - If the user provides multiple pieces of info at once, acknowledge all of them
            - Once you have PRODUCT + BRAND + STYLE collected, remind the user they can click \
            "✨ Generate Design" anytime they are ready
            - Do NOT re-ask for information already provided
            - Keep each response under 3 sentences

            GENERATION TRIGGER:
            When the user explicitly requests generation (e.g. "go ahead", "generate", "design it", \
            "let's do it", "make one", "create it", "I'm ready", "just do it", "another one", \
            "redesign", "try again") AND you have collected at least PRODUCT + BRAND + STYLE:
            1. Reply with a short confirmation (1-2 sentences max)
            2. Append this tag on a NEW LINE at the very end of your reply (no trailing text after it):
            [AUTO_GENERATE:{"description":"<full design brief in English, 80-150 words, include product, brand, style, colors, logo if any>","style":"<3-5 comma-separated style keywords>"}]
            IMPORTANT: Only append [AUTO_GENERATE:...] when the user explicitly requests generation. \
            Never add it during normal conversation. The JSON inside must be valid — no line breaks inside it.
            """;



    private static final String SYSTEM_PROMPT_ZH = """
            你是 foodPac 的包装设计顾问，专门帮助餐厅老板定制环保食品包装。

            你的目标是通过自然、友好的对话收集以下信息：
            1. 产品 — 包装里装什么食物？（例如：沙拉、汉堡、寿司、面条）
            2. 品牌 — 餐厅或品牌叫什么名字？
            3. 风格 — 设计风格偏好（例如：简约、复古、活泼、高端、现代）
            4. 色系 — 颜色偏好（例如：大地绿色、鲜艳红色、干净白色搭金色）
            5. Logo — 是否有 logo？如果有，请提供图片的直链 URL

            规则：
            - 每次只问一个问题，保持对话自然流畅
            - 语气温暖、鼓励、简洁
            - 如果用户一次提供了多条信息，全部确认并继续收集缺少的内容
            - 收集到至少【产品 + 品牌 + 风格】后，提醒用户可以随时点击「✨ 生成设计稿」按钮
            - 已收集的信息不要重复询问
            - 每条回复控制在 3 句话以内

            生成触发规则：
            当用户明确要求生成/设计/制作包装时（例如："帮我设计"、"生成"、"开始吧"、"就这样"、\
            "做一个"、"再来一个"、"重新设计"、"好的就这样"、"可以了"）\
            且已收集到至少【产品 + 品牌 + 风格】：
            1. 用简短的话确认正在开始（最多2句话）
            2. 在回复的最末尾另起一行追加以下标签（标签后不要有任何内容）：
            [AUTO_GENERATE:{"description":"<用英文写的完整设计说明，80-150字，包含产品、品牌、风格、配色、logo如有>","style":"<3-5个英文风格关键词，逗号分隔>"}]
            重要：只在用户明确要求生成时才追加 [AUTO_GENERATE:...]，正常对话中绝对不要添加。JSON 必须合法，不能在 JSON 内换行。
            """;

    // ── Public Methods ─────────────────────────────────────────────────────────

    /**
     * Create a brand-new session.
     * user may be null for guest (unauthenticated) sessions.
     */
    @Transactional
    public DesignSessionDto createSession(User user) {
        DesignSession session = DesignSession.builder()
                .user(user)          // null = guest session
                .status(DesignSession.Status.CHATTING)
                .build();
        session = sessionRepo.save(session);
        return DesignSessionDto.full(session, List.of(), List.of());
    }

    /**
     * Send a user message, call OpenAI, store both, return assistant reply.
     * user may be null for guest sessions.
     */
    @Transactional
    public DesignMessageDto chat(String sessionId, User user, String userText, String acceptLanguage) {
        DesignSession session = requireSession(sessionId, user);

        // Persist user message
        DesignMessage userMsg = DesignMessage.builder()
                .session(session)
                .role(DesignMessage.Role.user)
                .content(userText)
                .build();
        messageRepo.save(userMsg);

        // Build OpenAI message list
        List<Map<String, String>> messages = buildOpenAiMessages(session, acceptLanguage);

        // ── Fire chat + brief-extraction in parallel ─────────────────────────
        // extractDesignInfo only needs the conversation so far (user msg already
        // appended in buildOpenAiMessages), so it can run concurrently with chat.
        java.util.concurrent.CompletableFuture<String> chatFuture =
                java.util.concurrent.CompletableFuture.supplyAsync(() -> openAiClient.chat(messages));
        java.util.concurrent.CompletableFuture<Map<String, String>> infoFuture =
                java.util.concurrent.CompletableFuture.supplyAsync(() -> openAiClient.extractDesignInfo(messages));

        String rawReply;
        Map<String, String> designInfo;
        try {
            rawReply   = chatFuture.get();
            designInfo = infoFuture.get();
        } catch (Exception e) {
            throw new RuntimeException("OpenAI call failed", e);
        }

        // ── Strip and parse [AUTO_GENERATE:{...}] ────────────────────────────
        boolean autoGenerate = false;
        String description = null;
        String workingReply = rawReply;

        Matcher agMatcher = AUTO_GENERATE_PATTERN.matcher(workingReply);
        if (agMatcher.find() && session.getStatus() != DesignSession.Status.GENERATING) {
            try {
                JsonNode json = objectMapper.readTree(agMatcher.group(1));
                description = json.path("description").asText(null);
                if (description != null && !description.isBlank()) {
                    autoGenerate = true;
                    log.info("Auto-generate triggered for session={}", sessionId);
                }
            } catch (Exception e) {
                log.warn("Failed to parse AUTO_GENERATE JSON: {}", e.getMessage());
            }
            workingReply = workingReply.replace(agMatcher.group(0), "");
        }

        String visibleReply = workingReply.trim();

        // ── Persist assistant reply (AUTO_GENERATE tag already stripped) ──────
        DesignMessage assistantMsg = DesignMessage.builder()
                .session(session)
                .role(DesignMessage.Role.assistant)
                .content(visibleReply)
                .build();
        messageRepo.save(assistantMsg);

        // autoGenerate flag is returned to frontend; frontend calls packify.openDesign() directly
        return DesignMessageDto.fromFull(assistantMsg, autoGenerate, designInfo);
    }

    /**
     * Save design result images delivered by Packify SDK on the frontend.
     * Called via POST /api/v1/design/sessions/{id}/results.
     */
    @Transactional
    public void saveResults(String sessionId, User user, List<String> imageUrls) {
        DesignSession session = requireSession(sessionId, user);
        for (String url : imageUrls) {
            resultRepo.save(DesignResult.builder()
                    .session(session)
                    .imageUrl(url)
                    .build());
        }
        session.setStatus(DesignSession.Status.COMPLETED);
        sessionRepo.save(session);
        log.info("Saved {} results for session={}", imageUrls.size(), sessionId);
    }

    /** Load a full session (with messages + results). user may be null for guest sessions. */
    @Transactional(readOnly = true)
    public DesignSessionDto getSession(String sessionId, User user) {
        DesignSession session = requireSession(sessionId, user);
        List<DesignMessage> messages = messageRepo.findBySessionOrderByCreatedAtAsc(session);
        List<DesignResult> results = resultRepo.findBySessionOrderByCreatedAtAsc(session);
        return DesignSessionDto.full(session, messages, results);
    }

    /** List all sessions for the user (summary only, no messages) */
    @Transactional(readOnly = true)
    public List<DesignSessionDto> listSessions(User user) {
        return sessionRepo.findByUserOrderByCreatedAtDesc(user).stream()
                .map(s -> DesignSessionDto.summary(s, resultRepo.findBySessionOrderByCreatedAtAsc(s)))
                .toList();
    }

    /**
     * Migrate a guest session (user == null) to an authenticated user.
     * Called after login when the browser has a stored guest session ID.
     */
    @Transactional
    public DesignSessionDto migrateGuestSession(String guestSessionId, User user) {
        DesignSession session = sessionRepo.findById(guestSessionId)
                .orElseThrow(() -> new IllegalArgumentException("Guest session not found"));
        if (session.getUser() != null) {
            throw new IllegalStateException("Session already belongs to a user");
        }
        session.setUser(user);
        session = sessionRepo.save(session);
        List<DesignMessage> messages = messageRepo.findBySessionOrderByCreatedAtAsc(session);
        List<DesignResult> results   = resultRepo.findBySessionOrderByCreatedAtAsc(session);
        log.info("Migrated guest session={} to user={}", guestSessionId, user.getId());
        return DesignSessionDto.full(session, messages, results);
    }

    // ── Private Helpers ────────────────────────────────────────────────────────

    private List<Map<String, String>> buildOpenAiMessages(DesignSession session, String acceptLanguage) {
        boolean isChinese = acceptLanguage != null &&
                (acceptLanguage.startsWith("zh") || acceptLanguage.toLowerCase().contains("zh"));

        String systemPrompt = isChinese ? SYSTEM_PROMPT_ZH : SYSTEM_PROMPT_EN;

        List<Map<String, String>> msgs = new ArrayList<>();
        msgs.add(Map.of("role", "system", "content", systemPrompt));

        messageRepo.findBySessionOrderByCreatedAtAsc(session).forEach(m ->
                msgs.add(Map.of("role", m.getRole().name(), "content", m.getContent())));

        return msgs;
    }

    /**
     * Load and verify ownership of a session.
     * - Guest sessions (user == null): accessible by anyone who knows the session ID.
     * - User sessions: only accessible by the owning user.
     */
    private DesignSession requireSession(String sessionId, User caller) {
        DesignSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));
        User owner = session.getUser();
        if (owner == null) {
            // Guest session — accessible without auth
            return session;
        }
        if (caller == null || !owner.getId().equals(caller.getId())) {
            throw new SecurityException("Access denied");
        }
        return session;
    }
}
