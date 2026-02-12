package com.backend.backend.board.controller;

import com.backend.backend.board.entity.Board;
import com.backend.backend.board.entity.Category;
import com.backend.backend.board.repository.BoardRepository;
import com.backend.backend.board.repository.CategoryRepository;
import com.backend.backend.board.repository.CommentRepository;
import com.backend.backend.user.AuthController;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@RestController
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
@RequestMapping("/api/board")
public class BoardController {

    @Autowired
    private BoardRepository boardRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CommentRepository commentRepository;

    @GetMapping("/list")
    public Page<Board> getBoardList(
            @RequestParam(name = "category", required = false) String category,
            @RequestParam(name = "page", defaultValue = "0") int page) {

        Pageable pageable = PageRequest.of(page, 10, Sort.by("id").descending());

        if (category != null && !category.equals("all")) {
            return boardRepository.findByCategory_Id(Long.parseLong(category), pageable);
        }
        return boardRepository.findAll(pageable);
    }

    @GetMapping("/detail/{id}")
    public Board getBoardDetail(@PathVariable(name = "id") Long id) {
        Optional<Board> board = boardRepository.findById(id);
        return board.orElse(null);
    }

    @PostMapping("/write")
    public Board writeBoard(@RequestBody Board board, HttpSession session) {
        String username = getLoginUser(session);
        if (username != null) {
            board.setWriter(username);
        } else if (board.getWriter() == null || board.getWriter().trim().isEmpty()) {
            board.setWriter("익명");
        }
        if (board.getCategory() != null) {
            board.setCategory(resolveCategory(board.getCategory()));
        }
        return boardRepository.save(board);
    }

    @PutMapping("/update/{id}")
    public Board updateBoard(@PathVariable(name = "id") Long id, @RequestBody Board boardDetails, HttpSession session) {
        String username = getLoginUser(session);
        boolean admin = isAdmin(session);

        return boardRepository.findById(id).map(board -> {
            // 로그인된 경우 본인/관리자만, 비로그인이면 누구나 수정 허용
            if (username != null && !admin && (board.getWriter() == null || !board.getWriter().equals(username))) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not owner");
            }
            if (boardDetails.getTitle() != null) {
                board.setTitle(boardDetails.getTitle());
            }
            if (boardDetails.getContent() != null) {
                board.setContent(boardDetails.getContent());
            }
            if (boardDetails.getCategory() != null) {
                board.setCategory(resolveCategory(boardDetails.getCategory()));
            }
            if (boardDetails.getWriter() != null && !boardDetails.getWriter().trim().isEmpty()) {
                board.setWriter(boardDetails.getWriter());
            }
            return boardRepository.save(board);
        }).orElse(null);
    }

    @DeleteMapping("/delete/{id}")
    public String deleteBoard(@PathVariable(name = "id") Long id, HttpSession session) {
        String username = getLoginUser(session);
        boolean admin = isAdmin(session);

        Board board = boardRepository.findById(id).orElse(null);
        if (board == null) return "FAIL: ID " + id + " not found";
        // 로그인된 경우 본인/관리자만, 비로그인이면 누구나 삭제 허용
        if (username != null && !admin && (board.getWriter() == null || !board.getWriter().equals(username))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not owner");
        }

        commentRepository.deleteByBoard_Id(id);
        boardRepository.deleteById(id);
        return "SUCCESS: Deleted ID " + id;
    }

    /** 로그인되어 있으면 username, 아니면 null */
    private String getLoginUser(HttpSession session) {
        return (String) session.getAttribute(AuthController.SESSION_USER);
    }

    private boolean isAdmin(HttpSession session) {
        String role = (String) session.getAttribute("ROLE");
        return "ADMIN".equals(role);
    }

    private Category resolveCategory(Category incoming) {
        if (incoming == null) {
            return null;
        }
        Long id = incoming.getId();
        if (id != null) {
            return categoryRepository.findById(id).orElseGet(this::getDefaultCategory);
        }
        return getDefaultCategory();
    }

    private Category getDefaultCategory() {
        return categoryRepository.findFirstByOrderByIdAsc().orElseGet(() -> {
            Category c = new Category();
            c.setName("기본");
            return categoryRepository.save(c);
        });
    }
}