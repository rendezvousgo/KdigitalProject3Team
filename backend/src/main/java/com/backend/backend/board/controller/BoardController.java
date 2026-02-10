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
        String username = requireLogin(session);
        board.setWriter(username);
        if (board.getCategory() != null) {
            board.setCategory(resolveCategory(board.getCategory()));
        }
        return boardRepository.save(board);
    }

    @PutMapping("/update/{id}")
    public Board updateBoard(@PathVariable(name = "id") Long id, @RequestBody Board boardDetails, HttpSession session) {
        String username = requireLogin(session);
        boolean isAdmin = isAdmin(session);

        return boardRepository.findById(id).map(board -> {
            if (!isAdmin && (board.getWriter() == null || !board.getWriter().equals(username))) {
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
            board.setWriter(username);
            return boardRepository.save(board);
        }).orElse(null);
    }

    @DeleteMapping("/delete/{id}")
    public String deleteBoard(@PathVariable(name = "id") Long id, HttpSession session) {
        String username = requireLogin(session);
        boolean isAdmin = isAdmin(session);

        Board board = boardRepository.findById(id).orElse(null);
        if (board == null) return "FAIL: ID " + id + " not found";
        if (!isAdmin && (board.getWriter() == null || !board.getWriter().equals(username))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not owner");
        }

        commentRepository.deleteByBoard_Id(id);
        boardRepository.deleteById(id);
        return "SUCCESS: Deleted ID " + id;
    }

    private String requireLogin(HttpSession session) {
        String username = (String) session.getAttribute(AuthController.SESSION_USER);
        if (username == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "login required");
        }
        return username;
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